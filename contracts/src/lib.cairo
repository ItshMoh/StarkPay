#[starknet::interface]
pub trait IPayrollDispatcher<TContractState> {
    fn set_employer(ref self: TContractState, new_employer: starknet::ContractAddress);
    fn set_pool(ref self: TContractState, pool: starknet::ContractAddress);
    fn set_paused(ref self: TContractState, is_paused: bool);
    fn set_policy(ref self: TContractState, max_batch_recipients: u32, max_batch_total: u128);
    fn authorize_session_key(
        ref self: TContractState, session_key: starknet::ContractAddress, allowed: bool,
    );
    fn queue_batch(
        ref self: TContractState, batch_hash: felt252, recipient_count: u32, total_amount: u128,
    ) -> u64;
    fn execute_batch(ref self: TContractState, batch_id: u64);
    fn get_batch(self: @TContractState, batch_id: u64) -> (felt252, u128, bool);
    fn is_session_key_authorized(
        self: @TContractState, session_key: starknet::ContractAddress,
    ) -> bool;
    fn get_config(
        self: @TContractState,
    ) -> (starknet::ContractAddress, starknet::ContractAddress, bool, u32, u128);
}

#[starknet::contract]
mod PayrollDispatcher {
    use core::num::traits::Zero;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        employer: ContractAddress,
        pool: ContractAddress,
        is_paused: bool,
        next_batch_id: u64,
        max_batch_recipients: u32,
        max_batch_total: u128,
        session_keys: Map<ContractAddress, bool>,
        batch_hashes: Map<u64, felt252>,
        batch_totals: Map<u64, u128>,
        batch_executed: Map<u64, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        EmployerUpdated: EmployerUpdated,
        PoolUpdated: PoolUpdated,
        PauseUpdated: PauseUpdated,
        PolicyUpdated: PolicyUpdated,
        SessionKeyUpdated: SessionKeyUpdated,
        BatchQueued: BatchQueued,
        BatchExecuted: BatchExecuted,
    }

    #[derive(Drop, starknet::Event)]
    struct EmployerUpdated {
        old_employer: ContractAddress,
        new_employer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct PoolUpdated {
        old_pool: ContractAddress,
        new_pool: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct PauseUpdated {
        is_paused: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct PolicyUpdated {
        max_batch_recipients: u32,
        max_batch_total: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyUpdated {
        session_key: ContractAddress,
        allowed: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchQueued {
        batch_id: u64,
        batch_hash: felt252,
        recipient_count: u32,
        total_amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchExecuted {
        batch_id: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let caller = get_caller_address();
        self.employer.write(caller);
        self.is_paused.write(false);
        self.next_batch_id.write(1);
        self.max_batch_recipients.write(1_000_u32);
        self.max_batch_total.write(1_000_000_000_u128);
    }

    #[abi(embed_v0)]
    impl PayrollDispatcherImpl of super::IPayrollDispatcher<ContractState> {
        fn set_employer(ref self: ContractState, new_employer: ContractAddress) {
            assert(!new_employer.is_zero(), 'Invalid employer');
            assert_only_employer(@self);

            let old_employer = self.employer.read();
            self.employer.write(new_employer);
            self.emit(EmployerUpdated { old_employer, new_employer });
        }

        fn set_pool(ref self: ContractState, pool: ContractAddress) {
            assert(!pool.is_zero(), 'Invalid pool');
            assert_only_employer(@self);

            let old_pool = self.pool.read();
            self.pool.write(pool);
            self.emit(PoolUpdated { old_pool, new_pool: pool });
        }

        fn set_paused(ref self: ContractState, is_paused: bool) {
            assert_only_employer(@self);
            self.is_paused.write(is_paused);
            self.emit(PauseUpdated { is_paused });
        }

        fn set_policy(ref self: ContractState, max_batch_recipients: u32, max_batch_total: u128) {
            assert_only_employer(@self);
            assert(max_batch_recipients != 0_u32, 'Invalid recipients');
            assert(max_batch_total != 0_u128, 'Invalid total');

            self.max_batch_recipients.write(max_batch_recipients);
            self.max_batch_total.write(max_batch_total);
            self.emit(PolicyUpdated { max_batch_recipients, max_batch_total });
        }

        fn authorize_session_key(
            ref self: ContractState, session_key: ContractAddress, allowed: bool,
        ) {
            assert_only_employer(@self);
            assert(!session_key.is_zero(), 'Invalid session key');

            self.session_keys.write(session_key, allowed);
            self.emit(SessionKeyUpdated { session_key, allowed });
        }

        fn queue_batch(
            ref self: ContractState, batch_hash: felt252, recipient_count: u32, total_amount: u128,
        ) -> u64 {
            assert_caller_is_employer_or_session(@self);
            assert(!self.is_paused.read(), 'Dispatcher paused');
            assert(batch_hash != 0, 'Invalid batch hash');
            assert(recipient_count != 0_u32, 'Invalid recipients');
            assert(total_amount != 0_u128, 'Invalid total');
            assert(recipient_count <= self.max_batch_recipients.read(), 'Too many recipients');
            assert(total_amount <= self.max_batch_total.read(), 'Batch total too high');

            let batch_id = self.next_batch_id.read();
            self.next_batch_id.write(batch_id + 1_u64);
            self.batch_hashes.write(batch_id, batch_hash);
            self.batch_totals.write(batch_id, total_amount);
            self.batch_executed.write(batch_id, false);

            self.emit(BatchQueued { batch_id, batch_hash, recipient_count, total_amount });
            batch_id
        }

        fn execute_batch(ref self: ContractState, batch_id: u64) {
            assert_caller_is_employer_or_session(@self);
            assert(!self.is_paused.read(), 'Dispatcher paused');

            let batch_hash = self.batch_hashes.read(batch_id);
            assert(batch_hash != 0, 'Batch not found');
            assert(!self.batch_executed.read(batch_id), 'Batch already executed');

            self.batch_executed.write(batch_id, true);
            self.emit(BatchExecuted { batch_id });
        }

        fn get_batch(self: @ContractState, batch_id: u64) -> (felt252, u128, bool) {
            (
                self.batch_hashes.read(batch_id),
                self.batch_totals.read(batch_id),
                self.batch_executed.read(batch_id),
            )
        }

        fn is_session_key_authorized(self: @ContractState, session_key: ContractAddress) -> bool {
            self.session_keys.read(session_key)
        }

        fn get_config(self: @ContractState) -> (ContractAddress, ContractAddress, bool, u32, u128) {
            (
                self.employer.read(),
                self.pool.read(),
                self.is_paused.read(),
                self.max_batch_recipients.read(),
                self.max_batch_total.read(),
            )
        }
    }

    fn assert_only_employer(self: @ContractState) {
        assert(get_caller_address() == self.employer.read(), 'Only employer');
    }

    fn assert_caller_is_employer_or_session(self: @ContractState) {
        let caller = get_caller_address();
        let is_employer = caller == self.employer.read();
        let is_session = self.session_keys.read(caller);
        assert(is_employer || is_session, 'Unauthorized caller');
    }
}

#[starknet::interface]
pub trait IShieldedPool<TContractState> {
    fn set_dispatcher(ref self: TContractState, dispatcher: starknet::ContractAddress);
    fn set_denomination_mask(ref self: TContractState, mask: felt252);
    fn register_root(ref self: TContractState, root: felt252);
    fn spend_nullifier(ref self: TContractState, nullifier: felt252);
    fn is_root_known(self: @TContractState, root: felt252) -> bool;
    fn is_nullifier_spent(self: @TContractState, nullifier: felt252) -> bool;
    fn get_state(self: @TContractState) -> (starknet::ContractAddress, felt252, felt252, u64);
}

#[starknet::contract]
mod ShieldedPool {
    use core::num::traits::Zero;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        dispatcher: ContractAddress,
        latest_root: felt252,
        denomination_mask: felt252,
        root_count: u64,
        known_roots: Map<felt252, bool>,
        nullifiers: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DispatcherUpdated: DispatcherUpdated,
        DenominationMaskUpdated: DenominationMaskUpdated,
        RootRegistered: RootRegistered,
        NullifierSpent: NullifierSpent,
    }

    #[derive(Drop, starknet::Event)]
    struct DispatcherUpdated {
        old_dispatcher: ContractAddress,
        new_dispatcher: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DenominationMaskUpdated {
        mask: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct RootRegistered {
        root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct NullifierSpent {
        nullifier: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let caller = get_caller_address();
        self.dispatcher.write(caller);
        self.denomination_mask.write(0x7);
    }

    #[abi(embed_v0)]
    impl ShieldedPoolImpl of super::IShieldedPool<ContractState> {
        fn set_dispatcher(ref self: ContractState, dispatcher: ContractAddress) {
            assert_only_dispatcher(@self);
            assert(!dispatcher.is_zero(), 'Invalid dispatcher');

            let old_dispatcher = self.dispatcher.read();
            self.dispatcher.write(dispatcher);
            self.emit(DispatcherUpdated { old_dispatcher, new_dispatcher: dispatcher });
        }

        fn set_denomination_mask(ref self: ContractState, mask: felt252) {
            assert_only_dispatcher(@self);
            assert(mask != 0, 'Invalid mask');
            self.denomination_mask.write(mask);
            self.emit(DenominationMaskUpdated { mask });
        }

        fn register_root(ref self: ContractState, root: felt252) {
            assert_only_dispatcher(@self);
            assert(root != 0, 'Invalid root');

            self.latest_root.write(root);
            self.known_roots.write(root, true);
            self.root_count.write(self.root_count.read() + 1_u64);
            self.emit(RootRegistered { root });
        }

        fn spend_nullifier(ref self: ContractState, nullifier: felt252) {
            assert_only_dispatcher(@self);
            assert(nullifier != 0, 'Invalid nullifier');
            assert(!self.nullifiers.read(nullifier), 'Nullifier already spent');

            self.nullifiers.write(nullifier, true);
            self.emit(NullifierSpent { nullifier });
        }

        fn is_root_known(self: @ContractState, root: felt252) -> bool {
            self.known_roots.read(root)
        }

        fn is_nullifier_spent(self: @ContractState, nullifier: felt252) -> bool {
            self.nullifiers.read(nullifier)
        }

        fn get_state(self: @ContractState) -> (ContractAddress, felt252, felt252, u64) {
            (
                self.dispatcher.read(),
                self.latest_root.read(),
                self.denomination_mask.read(),
                self.root_count.read(),
            )
        }
    }

    fn assert_only_dispatcher(self: @ContractState) {
        assert(get_caller_address() == self.dispatcher.read(), 'Only dispatcher');
    }
}
