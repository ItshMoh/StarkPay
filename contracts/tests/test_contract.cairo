use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use starknet::ContractAddress;
use starknet::get_contract_address;

use contracts::IPayrollDispatcherDispatcher;
use contracts::IPayrollDispatcherDispatcherTrait;
use contracts::IPayrollDispatcherSafeDispatcher;
use contracts::IPayrollDispatcherSafeDispatcherTrait;
use contracts::IShieldedPoolDispatcher;
use contracts::IShieldedPoolDispatcherTrait;
use contracts::IShieldedPoolSafeDispatcher;
use contracts::IShieldedPoolSafeDispatcherTrait;

fn deploy_contract(name: ByteArray, constructor_calldata: Array<felt252>) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

fn current_test_address_felt() -> felt252 {
    let current: ContractAddress = get_contract_address();
    current.into()
}

fn deploy_dispatcher() -> ContractAddress {
    let mut calldata = ArrayTrait::new();
    calldata.append(current_test_address_felt());
    deploy_contract("PayrollDispatcher", calldata)
}

fn deploy_pool() -> ContractAddress {
    let mut calldata = ArrayTrait::new();
    calldata.append(current_test_address_felt());
    deploy_contract("ShieldedPool", calldata)
}

fn deploy_mock_verifier() -> ContractAddress {
    deploy_contract("MockProofVerifier", ArrayTrait::new())
}

#[test]
fn test_dispatcher_queue_and_execute_batch() {
    let dispatcher_address = deploy_dispatcher();
    let pool_address = deploy_pool();

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
    let dispatcher_address = deploy_dispatcher();
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
    let pool_address = deploy_pool();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    pool.register_root(0xABC);
    assert(pool.is_root_known(0xABC), 'Root should be known');

    pool.spend_nullifier(0xA1);
    assert(pool.is_nullifier_spent(0xA1), 'Nullifier should be spent');
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_duplicate_nullifier() {
    let pool_address = deploy_pool();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    safe_pool.spend_nullifier(0xB2).unwrap();

    match safe_pool.spend_nullifier(0xB2) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed double spend'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Nullifier already spent', *panic_data.at(0));
        },
    };
}

#[test]
fn test_shielded_pool_accepts_valid_proofs_for_lifecycle() {
    let pool_address = deploy_pool();
    let verifier_address = deploy_mock_verifier();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    pool.set_verifier(verifier_address);

    pool.deposit(0x111, 0xAA, 0x9001, 0x9001);
    assert(pool.is_root_known(0x111), 'Deposit root should be known');

    pool.spend(0x111, 0xA1, 0x222, 0xBB, 0x9002, 0x9002);
    assert(pool.is_root_known(0x222), 'Spend root should be known');
    assert(pool.is_nullifier_spent(0xA1), 'Spend nullifier should be spent');

    pool.withdraw(0x222, 0xA2, verifier_address, 10_u128, 0x9003, 0x9003);
    assert(pool.is_nullifier_spent(0xA2), 'Withdraw nullifier spent');
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_invalid_proof() {
    let pool_address = deploy_pool();
    let verifier_address = deploy_mock_verifier();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    safe_pool.set_verifier(verifier_address).unwrap();

    match safe_pool.deposit(0x123, 0xAB, 0x9004, 0xDEAD) {
        Result::Ok(_) => core::panic_with_felt252('Invalid proof should fail'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Invalid proof', *panic_data.at(0));
        },
    };
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_root_mismatch() {
    let pool_address = deploy_pool();
    let verifier_address = deploy_mock_verifier();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    safe_pool.set_verifier(verifier_address).unwrap();
    safe_pool.deposit(0x444, 0xAB, 0x9100, 0x9100).unwrap();

    match safe_pool.spend(0x999, 0xB1, 0x555, 0xBC, 0x9101, 0x9101) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed unknown root'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Unknown root', *panic_data.at(0));
        },
    };
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_double_spend_with_verifier_path() {
    let pool_address = deploy_pool();
    let verifier_address = deploy_mock_verifier();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    safe_pool.set_verifier(verifier_address).unwrap();
    safe_pool.deposit(0x777, 0xCD, 0x9200, 0x9200).unwrap();
    safe_pool.spend(0x777, 0xD1, 0x888, 0xEF, 0x9201, 0x9201).unwrap();

    match safe_pool.withdraw(0x888, 0xD1, verifier_address, 5_u128, 0x9202, 0x9202) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed double spend'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Nullifier already spent', *panic_data.at(0));
        },
    };
}
