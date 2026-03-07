use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::ContractAddress;

use contracts::IPayrollDispatcherDispatcher;
use contracts::IPayrollDispatcherDispatcherTrait;
use contracts::IPayrollDispatcherSafeDispatcher;
use contracts::IPayrollDispatcherSafeDispatcherTrait;
use contracts::IShieldedPoolDispatcher;
use contracts::IShieldedPoolDispatcherTrait;
use contracts::IShieldedPoolSafeDispatcher;
use contracts::IShieldedPoolSafeDispatcherTrait;

fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

#[test]
fn test_dispatcher_queue_and_execute_batch() {
    let dispatcher_address = deploy_contract("PayrollDispatcher");
    let pool_address = deploy_contract("ShieldedPool");

    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    dispatcher.set_pool(pool_address);
    dispatcher.set_policy(16_u32, 10_000_u128);

    let batch_id = dispatcher.queue_batch(0x123, 3_u32, 300_u128);
    assert(batch_id == 1_u64, 'Invalid batch id');

    let (batch_hash, total_amount, is_executed) = dispatcher.get_batch(batch_id);
    assert(batch_hash == 0x123, 'Invalid batch hash');
    assert(total_amount == 300_u128, 'Invalid total amount');
    assert(!is_executed, 'Batch should not be executed');

    dispatcher.execute_batch(batch_id);

    let (_, _, is_executed_after) = dispatcher.get_batch(batch_id);
    assert(is_executed_after, 'Batch should be executed');
}

#[test]
#[feature("safe_dispatcher")]
fn test_dispatcher_policy_rejects_large_batch() {
    let dispatcher_address = deploy_contract("PayrollDispatcher");
    let safe_dispatcher = IPayrollDispatcherSafeDispatcher { contract_address: dispatcher_address };

    safe_dispatcher.set_policy(2_u32, 500_u128).unwrap();

    match safe_dispatcher.queue_batch(0x456, 3_u32, 200_u128) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed policy'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Too many recipients', *panic_data.at(0));
        },
    };
}

#[test]
fn test_shielded_pool_root_and_nullifier_lifecycle() {
    let pool_address = deploy_contract("ShieldedPool");
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    pool.register_root(0xABC);
    assert(pool.is_root_known(0xABC), 'Root should be known');

    pool.spend_nullifier(0xA1);
    assert(pool.is_nullifier_spent(0xA1), 'Nullifier should be spent');
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_duplicate_nullifier() {
    let pool_address = deploy_contract("ShieldedPool");
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    safe_pool.spend_nullifier(0xB2).unwrap();

    match safe_pool.spend_nullifier(0xB2) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed double spend'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Nullifier already spent', *panic_data.at(0));
        },
    };
}
