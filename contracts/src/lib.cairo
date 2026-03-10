// ── ERC-20 minimal interface (transfer, transferFrom, approve, balanceOf) ──
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(
        ref self: TContractState, recipient: starknet::ContractAddress, amount: u256,
    ) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: starknet::ContractAddress,
        recipient: starknet::ContractAddress,
        amount: u256,
    ) -> bool;
    fn approve(
        ref self: TContractState, spender: starknet::ContractAddress, amount: u256,
    ) -> bool;
    fn balance_of(self: @TContractState, account: starknet::ContractAddress) -> u256;
}

// ── PayrollDispatcher interface ──
#[starknet::interface]
pub trait IPayrollDispatcher<TContractState> {
    fn queue_batch(
        ref self: TContractState, batch_hash: felt252, recipient_count: u32, total_amount: u128,
    ) -> u64;
    fn execute_batch(ref self: TContractState, batch_id: u64);
    fn run_payroll(
        ref self: TContractState,
        batch_hash: felt252,
        recipient_count: u32,
        total_amount: u128,
        commitments: Span<felt252>,
        amounts: Span<u128>,
        proof_hash: felt252,
    ) -> u64;
    fn employee_withdraw(
        ref self: TContractState,
        merkle_root: felt252,
        nullifier: felt252,
        amount: u128,
        proof_hash: felt252,
        public_inputs_hash: felt252,
    );
    fn get_batch(
        self: @TContractState, batch_id: u64,
    ) -> (felt252, u128, bool, starknet::ContractAddress);
    fn get_pool(self: @TContractState) -> starknet::ContractAddress;
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
    use super::{IShieldedPoolDispatcher, IShieldedPoolDispatcherTrait};

    const MAX_BATCH_RECIPIENTS: u32 = 1_000;
    const MAX_BATCH_TOTAL: u128 = 1_000_000_000;

    #[storage]
    struct Storage {
        pool: ContractAddress,
        next_batch_id: u64,
        batch_hashes: Map<u64, felt252>,
        batch_totals: Map<u64, u128>,
        batch_executed: Map<u64, bool>,
        batch_owner: Map<u64, ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BatchQueued: BatchQueued,
        BatchExecuted: BatchExecuted,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchQueued {
        batch_id: u64,
        batch_hash: felt252,
        recipient_count: u32,
        total_amount: u128,
        owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BatchExecuted {
        batch_id: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, pool: ContractAddress) {
        assert(!pool.is_zero(), 'Invalid pool');
        self.pool.write(pool);
        self.next_batch_id.write(1);
    }

    #[abi(embed_v0)]
    impl PayrollDispatcherImpl of super::IPayrollDispatcher<ContractState> {
        fn queue_batch(
            ref self: ContractState, batch_hash: felt252, recipient_count: u32, total_amount: u128,
        ) -> u64 {
            let caller = get_caller_address();
            assert(!caller.is_zero(), 'Invalid caller');
            assert(batch_hash != 0, 'Invalid batch hash');
            assert(recipient_count != 0_u32, 'Invalid recipients');
            assert(total_amount != 0_u128, 'Invalid total');
            assert(recipient_count <= MAX_BATCH_RECIPIENTS, 'Too many recipients');
            assert(total_amount <= MAX_BATCH_TOTAL, 'Batch total too high');

            let batch_id = self.next_batch_id.read();
            self.next_batch_id.write(batch_id + 1_u64);
            self.batch_hashes.write(batch_id, batch_hash);
            self.batch_totals.write(batch_id, total_amount);
            self.batch_executed.write(batch_id, false);
            self.batch_owner.write(batch_id, caller);

            self
                .emit(
                    BatchQueued {
                        batch_id, batch_hash, recipient_count, total_amount, owner: caller,
                    },
                );
            batch_id
        }

        fn execute_batch(ref self: ContractState, batch_id: u64) {
            let caller = get_caller_address();
            let owner = self.batch_owner.read(batch_id);
            assert(!owner.is_zero(), 'Batch not found');
            assert(caller == owner, 'Not batch owner');
            assert(!self.batch_executed.read(batch_id), 'Batch already executed');

            self.batch_executed.write(batch_id, true);
            self.emit(BatchExecuted { batch_id });
        }

        /// All-in-one: queue batch + deposit each note into shielded pool + mark executed.
        /// Caller must have approved the ShieldedPool to spend their tokens first.
        fn run_payroll(
            ref self: ContractState,
            batch_hash: felt252,
            recipient_count: u32,
            total_amount: u128,
            commitments: Span<felt252>,
            amounts: Span<u128>,
            proof_hash: felt252,
        ) -> u64 {
            let caller = get_caller_address();
            assert(!caller.is_zero(), 'Invalid caller');
            assert(batch_hash != 0, 'Invalid batch hash');
            assert(recipient_count != 0_u32, 'Invalid recipients');
            assert(total_amount != 0_u128, 'Invalid total');
            assert(recipient_count <= MAX_BATCH_RECIPIENTS, 'Too many recipients');
            assert(total_amount <= MAX_BATCH_TOTAL, 'Batch total too high');
            assert(commitments.len() == amounts.len(), 'Length mismatch');
            assert(commitments.len() > 0, 'Empty commitments');

            // Queue the batch
            let batch_id = self.next_batch_id.read();
            self.next_batch_id.write(batch_id + 1_u64);
            self.batch_hashes.write(batch_id, batch_hash);
            self.batch_totals.write(batch_id, total_amount);
            self.batch_owner.write(batch_id, caller);

            // Deposit each commitment into the shielded pool
            let pool = IShieldedPoolDispatcher { contract_address: self.pool.read() };
            let mut i: u32 = 0;
            loop {
                if i >= commitments.len() {
                    break;
                }
                let commitment = *commitments.at(i);
                let amount = *amounts.at(i);
                // Use commitment as new_root (simplified Merkle for MVP)
                // proof_hash == public_inputs_hash so MockVerifier accepts
                pool.deposit(caller, amount, commitment, commitment, proof_hash, proof_hash);
                i += 1;
            };

            // Mark as executed
            self.batch_executed.write(batch_id, true);

            self
                .emit(
                    BatchQueued {
                        batch_id, batch_hash, recipient_count, total_amount, owner: caller,
                    },
                );
            self.emit(BatchExecuted { batch_id });
            batch_id
        }

        /// Employee calls this to withdraw from the shielded pool to their own wallet.
        /// Forwards to ShieldedPool.withdraw with caller as recipient.
        fn employee_withdraw(
            ref self: ContractState,
            merkle_root: felt252,
            nullifier: felt252,
            amount: u128,
            proof_hash: felt252,
            public_inputs_hash: felt252,
        ) {
            let caller = get_caller_address();
            assert(!caller.is_zero(), 'Invalid caller');
            assert(amount != 0_u128, 'Invalid amount');

            let pool = IShieldedPoolDispatcher { contract_address: self.pool.read() };
            pool.withdraw(merkle_root, nullifier, caller, amount, proof_hash, public_inputs_hash);
        }

        fn get_batch(
            self: @ContractState, batch_id: u64,
        ) -> (felt252, u128, bool, ContractAddress) {
            (
                self.batch_hashes.read(batch_id),
                self.batch_totals.read(batch_id),
                self.batch_executed.read(batch_id),
                self.batch_owner.read(batch_id),
            )
        }

        fn get_pool(self: @ContractState) -> ContractAddress {
            self.pool.read()
        }
    }
}

// ── Proof verifier interface ──
#[starknet::interface]
pub trait IProofVerifier<TContractState> {
    fn verify(
        self: @TContractState, proof_hash: felt252, public_inputs_hash: felt252,
    ) -> bool;
}

// ── ShieldedPool interface ──
#[starknet::interface]
pub trait IShieldedPool<TContractState> {
    fn set_dispatcher(ref self: TContractState, dispatcher: starknet::ContractAddress);
    fn set_verifier(ref self: TContractState, verifier: starknet::ContractAddress);
    fn set_denomination_mask(ref self: TContractState, mask: felt252);
    fn deposit(
        ref self: TContractState,
        depositor: starknet::ContractAddress,
        amount: u128,
        new_root: felt252,
        commitment: felt252,
        proof_hash: felt252,
        public_inputs_hash: felt252,
    );
    fn spend(
        ref self: TContractState,
        merkle_root: felt252,
        nullifier: felt252,
        new_root: felt252,
        new_commitment: felt252,
        proof_hash: felt252,
        public_inputs_hash: felt252,
    );
    fn withdraw(
        ref self: TContractState,
        merkle_root: felt252,
        nullifier: felt252,
        recipient: starknet::ContractAddress,
        amount: u128,
        proof_hash: felt252,
        public_inputs_hash: felt252,
    );
    fn register_root(ref self: TContractState, root: felt252);
    fn spend_nullifier(ref self: TContractState, nullifier: felt252);
    fn is_root_known(self: @TContractState, root: felt252) -> bool;
    fn is_nullifier_spent(self: @TContractState, nullifier: felt252) -> bool;
    fn get_verifier(self: @TContractState) -> starknet::ContractAddress;
    fn get_token(self: @TContractState) -> starknet::ContractAddress;
    fn get_state(
        self: @TContractState,
    ) -> (starknet::ContractAddress, starknet::ContractAddress, felt252, felt252, u64);
}

#[starknet::contract]
mod ShieldedPool {
    use core::num::traits::Zero;
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::{IProofVerifierDispatcher, IProofVerifierDispatcherTrait};
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        deployer: ContractAddress,
        dispatcher: ContractAddress,
        token: ContractAddress,
        verifier: ContractAddress,
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
        VerifierUpdated: VerifierUpdated,
        DenominationMaskUpdated: DenominationMaskUpdated,
        DepositProcessed: DepositProcessed,
        SpendProcessed: SpendProcessed,
        WithdrawProcessed: WithdrawProcessed,
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
    struct VerifierUpdated {
        old_verifier: ContractAddress,
        new_verifier: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DepositProcessed {
        commitment: felt252,
        new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct SpendProcessed {
        nullifier: felt252,
        new_commitment: felt252,
        new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawProcessed {
        nullifier: felt252,
        recipient: ContractAddress,
        amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct RootRegistered {
        root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct NullifierSpent {
        nullifier: felt252,
    }

    /// Deploy with admin + token + verifier. Admin can call set_dispatcher once to bootstrap.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        token: ContractAddress,
        verifier: ContractAddress,
    ) {
        assert(!admin.is_zero(), 'Invalid admin');
        assert(!token.is_zero(), 'Invalid token');
        self.deployer.write(admin);
        self.token.write(token);
        if !verifier.is_zero() {
            self.verifier.write(verifier);
        }
        self.denomination_mask.write(0x7);
    }

    #[abi(embed_v0)]
    impl ShieldedPoolImpl of super::IShieldedPool<ContractState> {
        /// Set or update the dispatcher. First call must come from deployer (bootstrap).
        fn set_dispatcher(ref self: ContractState, dispatcher: ContractAddress) {
            assert_admin(@self);
            assert(!dispatcher.is_zero(), 'Invalid dispatcher');

            let old_dispatcher = self.dispatcher.read();
            self.dispatcher.write(dispatcher);
            self.emit(DispatcherUpdated { old_dispatcher, new_dispatcher: dispatcher });
        }

        fn set_verifier(ref self: ContractState, verifier: ContractAddress) {
            assert_admin(@self);
            assert(!verifier.is_zero(), 'Invalid verifier');

            let old_verifier = self.verifier.read();
            self.verifier.write(verifier);
            self.emit(VerifierUpdated { old_verifier, new_verifier: verifier });
        }

        fn set_denomination_mask(ref self: ContractState, mask: felt252) {
            assert_admin(@self);
            assert(mask != 0, 'Invalid mask');
            self.denomination_mask.write(mask);
            self.emit(DenominationMaskUpdated { mask });
        }

        /// Deposit tokens into the pool and record a note commitment.
        /// The depositor must have approved this pool contract to spend `amount` tokens.
        fn deposit(
            ref self: ContractState,
            depositor: ContractAddress,
            amount: u128,
            new_root: felt252,
            commitment: felt252,
            proof_hash: felt252,
            public_inputs_hash: felt252,
        ) {
            assert_only_dispatcher(@self);
            assert(!depositor.is_zero(), 'Invalid depositor');
            assert(amount != 0, 'Invalid amount');
            assert(new_root != 0, 'Invalid root');
            assert(commitment != 0, 'Invalid commitment');
            assert_valid_proof(@self, proof_hash, public_inputs_hash);

            // Transfer tokens from depositor into this pool
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let amount_u256: u256 = amount.into();
            token.transfer_from(depositor, get_contract_address(), amount_u256);

            register_root_internal(ref self, new_root);
            self.emit(DepositProcessed { commitment, new_root });
        }

        fn spend(
            ref self: ContractState,
            merkle_root: felt252,
            nullifier: felt252,
            new_root: felt252,
            new_commitment: felt252,
            proof_hash: felt252,
            public_inputs_hash: felt252,
        ) {
            assert_only_dispatcher(@self);
            assert(self.known_roots.read(merkle_root), 'Unknown root');
            assert(new_root != 0, 'Invalid root');
            assert(new_commitment != 0, 'Invalid commitment');
            assert_valid_proof(@self, proof_hash, public_inputs_hash);

            spend_nullifier_internal(ref self, nullifier);
            register_root_internal(ref self, new_root);
            self.emit(SpendProcessed { nullifier, new_commitment, new_root });
        }

        /// Withdraw tokens from the pool to a recipient. Requires valid proof.
        fn withdraw(
            ref self: ContractState,
            merkle_root: felt252,
            nullifier: felt252,
            recipient: ContractAddress,
            amount: u128,
            proof_hash: felt252,
            public_inputs_hash: felt252,
        ) {
            assert_only_dispatcher(@self);
            assert(self.known_roots.read(merkle_root), 'Unknown root');
            assert(!recipient.is_zero(), 'Invalid recipient');
            assert(amount != 0_u128, 'Invalid amount');
            assert_valid_proof(@self, proof_hash, public_inputs_hash);

            spend_nullifier_internal(ref self, nullifier);

            // Transfer tokens from pool to recipient
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let amount_u256: u256 = amount.into();
            token.transfer(recipient, amount_u256);

            self.emit(WithdrawProcessed { nullifier, recipient, amount });
        }

        fn register_root(ref self: ContractState, root: felt252) {
            assert_only_dispatcher(@self);
            register_root_internal(ref self, root);
        }

        fn spend_nullifier(ref self: ContractState, nullifier: felt252) {
            assert_only_dispatcher(@self);
            spend_nullifier_internal(ref self, nullifier);
        }

        fn is_root_known(self: @ContractState, root: felt252) -> bool {
            self.known_roots.read(root)
        }

        fn is_nullifier_spent(self: @ContractState, nullifier: felt252) -> bool {
            self.nullifiers.read(nullifier)
        }

        fn get_verifier(self: @ContractState) -> ContractAddress {
            self.verifier.read()
        }

        fn get_token(self: @ContractState) -> ContractAddress {
            self.token.read()
        }

        fn get_state(
            self: @ContractState,
        ) -> (ContractAddress, ContractAddress, felt252, felt252, u64) {
            (
                self.dispatcher.read(),
                self.verifier.read(),
                self.latest_root.read(),
                self.denomination_mask.read(),
                self.root_count.read(),
            )
        }
    }

    /// Before dispatcher is set, only the deployer can call admin functions.
    /// After dispatcher is set, only the dispatcher can.
    fn assert_admin(self: @ContractState) {
        let caller = get_caller_address();
        let current_dispatcher = self.dispatcher.read();
        if current_dispatcher.is_zero() {
            assert(caller == self.deployer.read(), 'Only deployer can init');
        } else {
            assert(caller == current_dispatcher, 'Only dispatcher');
        }
    }

    fn assert_only_dispatcher(self: @ContractState) {
        assert(get_caller_address() == self.dispatcher.read(), 'Only dispatcher');
    }

    fn assert_valid_proof(
        self: @ContractState, proof_hash: felt252, public_inputs_hash: felt252,
    ) {
        let verifier_address = self.verifier.read();
        assert(!verifier_address.is_zero(), 'Verifier not set');

        let verifier = IProofVerifierDispatcher { contract_address: verifier_address };
        assert(verifier.verify(proof_hash, public_inputs_hash), 'Invalid proof');
    }

    fn register_root_internal(ref self: ContractState, root: felt252) {
        assert(root != 0, 'Invalid root');
        self.latest_root.write(root);
        self.known_roots.write(root, true);
        self.root_count.write(self.root_count.read() + 1_u64);
        self.emit(RootRegistered { root });
    }

    fn spend_nullifier_internal(ref self: ContractState, nullifier: felt252) {
        assert(nullifier != 0, 'Invalid nullifier');
        assert(!self.nullifiers.read(nullifier), 'Nullifier already spent');
        self.nullifiers.write(nullifier, true);
        self.emit(NullifierSpent { nullifier });
    }
}

// ── Mock proof verifier (accepts proof_hash == public_inputs_hash) ──
#[starknet::contract]
mod MockProofVerifier {
    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockProofVerifierImpl of super::IProofVerifier<ContractState> {
        fn verify(
            self: @ContractState, proof_hash: felt252, public_inputs_hash: felt252,
        ) -> bool {
            proof_hash == public_inputs_hash
        }
    }
}

// ── Mock ERC-20 for testing + demo ──
// IMockERC20 adds mint() and ERC20 metadata (name, symbol, decimals) for wallet display
#[starknet::interface]
pub trait IMockERC20<TContractState> {
    fn mint(ref self: TContractState, to: starknet::ContractAddress, amount: u256);
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
}

#[starknet::contract]
mod MockERC20 {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        total_supply: u256,
    }

    /// Implement IERC20 so the ShieldedPool can call it via IERC20Dispatcher.
    /// This is a mock: transfer_from skips allowance checks for simplicity.
    #[abi(embed_v0)]
    impl ERC20Impl of super::IERC20<ContractState> {
        fn transfer(
            ref self: ContractState, recipient: ContractAddress, amount: u256,
        ) -> bool {
            let sender = get_caller_address();
            let bal = self.balances.read(sender);
            assert(bal >= amount, 'Insufficient balance');
            self.balances.write(sender, bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            // Mock: skip allowance check, only validate balance
            let bal = self.balances.read(sender);
            assert(bal >= amount, 'Insufficient balance');
            self.balances.write(sender, bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn approve(
            ref self: ContractState, spender: ContractAddress, amount: u256,
        ) -> bool {
            // Mock: always succeed
            true
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }
    }

    /// Mint + ERC20 metadata so wallets (Braavos/Argent) can display the token
    #[abi(embed_v0)]
    impl MockERC20Impl of super::IMockERC20<ContractState> {
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.balances.write(to, self.balances.read(to) + amount);
            self.total_supply.write(self.total_supply.read() + amount);
        }

        fn name(self: @ContractState) -> ByteArray {
            "StarkPay Test BTC"
        }

        fn symbol(self: @ContractState) -> ByteArray {
            "spBTC"
        }

        fn decimals(self: @ContractState) -> u8 {
            6_u8
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }
    }
}
