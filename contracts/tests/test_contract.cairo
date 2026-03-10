use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use starknet::get_contract_address;
use starknet::contract_address_const;

use contracts::IPayrollDispatcherDispatcher;
use contracts::IPayrollDispatcherDispatcherTrait;
use contracts::IPayrollDispatcherSafeDispatcher;
use contracts::IPayrollDispatcherSafeDispatcherTrait;
use contracts::IShieldedPoolDispatcher;
use contracts::IShieldedPoolDispatcherTrait;
use contracts::IShieldedPoolSafeDispatcher;
use contracts::IShieldedPoolSafeDispatcherTrait;
use contracts::IERC20Dispatcher;
use contracts::IERC20DispatcherTrait;
use contracts::IMockERC20Dispatcher;
use contracts::IMockERC20DispatcherTrait;

fn deploy_contract(name: ByteArray, constructor_calldata: Array<felt252>) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

fn deploy_mock_token() -> ContractAddress {
    deploy_contract("MockERC20", ArrayTrait::new())
}

fn deploy_mock_verifier() -> ContractAddress {
    deploy_contract("MockProofVerifier", ArrayTrait::new())
}

/// Deploy pool with admin + token + verifier. Dispatcher not yet set (admin can init).
fn deploy_pool_raw(token: ContractAddress, verifier: ContractAddress) -> ContractAddress {
    let mut calldata = ArrayTrait::new();
    let admin: ContractAddress = get_contract_address();
    let admin_felt: felt252 = admin.into();
    let token_felt: felt252 = token.into();
    let verifier_felt: felt252 = verifier.into();
    calldata.append(admin_felt);
    calldata.append(token_felt);
    calldata.append(verifier_felt);
    deploy_contract("ShieldedPool", calldata)
}

/// Deploy the full stack: token + verifier + pool + dispatcher, with pool.set_dispatcher wired.
fn deploy_full_stack() -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress) {
    let token_address = deploy_mock_token();
    let verifier_address = deploy_mock_verifier();
    let pool_address = deploy_pool_raw(token_address, verifier_address);

    // Deploy dispatcher with pool
    let mut calldata = ArrayTrait::new();
    let pool_felt: felt252 = pool_address.into();
    calldata.append(pool_felt);
    let dispatcher_address = deploy_contract("PayrollDispatcher", calldata);

    // Wire pool -> dispatcher (test contract is the deployer, so this works)
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    pool.set_dispatcher(dispatcher_address);

    (token_address, verifier_address, pool_address, dispatcher_address)
}

/// Deploy just a dispatcher with an arbitrary pool address (for basic dispatcher-only tests)
fn deploy_dispatcher_standalone() -> ContractAddress {
    let token_address = deploy_mock_token();
    let verifier_address = deploy_mock_verifier();
    let pool_address = deploy_pool_raw(token_address, verifier_address);
    let mut calldata = ArrayTrait::new();
    let pool_felt: felt252 = pool_address.into();
    calldata.append(pool_felt);
    deploy_contract("PayrollDispatcher", calldata)
}

// ── PayrollDispatcher tests ──

#[test]
fn test_dispatcher_queue_and_execute_batch() {
    let dispatcher_address = deploy_dispatcher_standalone();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };

    let batch_id = dispatcher.queue_batch(0x123, 3_u32, 300_u128);
    assert(batch_id == 1_u64, 'Invalid batch id');

    let (batch_hash, total_amount, is_executed, owner) = dispatcher.get_batch(batch_id);
    assert(batch_hash == 0x123, 'Invalid batch hash');
    assert(total_amount == 300_u128, 'Invalid total amount');
    assert(!is_executed, 'Batch should not be executed');
    assert(owner == get_contract_address(), 'Invalid owner');

    dispatcher.execute_batch(batch_id);

    let (_, _, is_executed_after, _) = dispatcher.get_batch(batch_id);
    assert(is_executed_after, 'Batch should be executed');
}

#[test]
fn test_dispatcher_any_wallet_can_queue() {
    let dispatcher_address = deploy_dispatcher_standalone();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };

    let wallet_a: ContractAddress = contract_address_const::<0xAAA>();
    let wallet_b: ContractAddress = contract_address_const::<0xBBB>();

    start_cheat_caller_address(dispatcher_address, wallet_a);
    let batch_a = dispatcher.queue_batch(0x111, 1_u32, 100_u128);
    stop_cheat_caller_address(dispatcher_address);

    start_cheat_caller_address(dispatcher_address, wallet_b);
    let batch_b = dispatcher.queue_batch(0x222, 2_u32, 200_u128);
    stop_cheat_caller_address(dispatcher_address);

    let (_, _, _, owner_a) = dispatcher.get_batch(batch_a);
    let (_, _, _, owner_b) = dispatcher.get_batch(batch_b);
    assert(owner_a == wallet_a, 'Batch A wrong owner');
    assert(owner_b == wallet_b, 'Batch B wrong owner');
}

#[test]
#[feature("safe_dispatcher")]
fn test_dispatcher_non_owner_cannot_execute() {
    let dispatcher_address = deploy_dispatcher_standalone();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    let safe_dispatcher = IPayrollDispatcherSafeDispatcher {
        contract_address: dispatcher_address,
    };

    let wallet_a: ContractAddress = contract_address_const::<0xAAA>();
    let wallet_b: ContractAddress = contract_address_const::<0xBBB>();

    start_cheat_caller_address(dispatcher_address, wallet_a);
    let batch_id = dispatcher.queue_batch(0x111, 1_u32, 100_u128);
    stop_cheat_caller_address(dispatcher_address);

    start_cheat_caller_address(dispatcher_address, wallet_b);
    match safe_dispatcher.execute_batch(batch_id) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Not batch owner', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(dispatcher_address);
}

#[test]
#[feature("safe_dispatcher")]
fn test_dispatcher_policy_rejects_too_many_recipients() {
    let dispatcher_address = deploy_dispatcher_standalone();
    let safe_dispatcher = IPayrollDispatcherSafeDispatcher {
        contract_address: dispatcher_address,
    };

    match safe_dispatcher.queue_batch(0x456, 1_001_u32, 200_u128) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed policy'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Too many recipients', *panic_data.at(0));
        },
    };
}

#[test]
#[feature("safe_dispatcher")]
fn test_dispatcher_rejects_double_execute() {
    let dispatcher_address = deploy_dispatcher_standalone();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    let safe_dispatcher = IPayrollDispatcherSafeDispatcher {
        contract_address: dispatcher_address,
    };

    let batch_id = dispatcher.queue_batch(0x789, 1_u32, 50_u128);
    dispatcher.execute_batch(batch_id);

    match safe_dispatcher.execute_batch(batch_id) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Batch already executed', *panic_data.at(0));
        },
    };
}

#[test]
fn test_dispatcher_get_pool() {
    let (_, _, pool_address, dispatcher_address) = deploy_full_stack();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    assert(dispatcher.get_pool() == pool_address, 'Wrong pool address');
}

// ── ShieldedPool tests ──

#[test]
fn test_shielded_pool_root_and_nullifier_lifecycle() {
    let (_, _, pool_address, dispatcher_address) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    // Call as dispatcher
    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.register_root(0xABC);
    assert(pool.is_root_known(0xABC), 'Root should be known');

    pool.spend_nullifier(0xA1);
    assert(pool.is_nullifier_spent(0xA1), 'Nullifier should be spent');
    stop_cheat_caller_address(pool_address);
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_duplicate_nullifier() {
    let (_, _, pool_address, dispatcher_address) = deploy_full_stack();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, dispatcher_address);
    safe_pool.spend_nullifier(0xB2).unwrap();

    match safe_pool.spend_nullifier(0xB2) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed double spend'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Nullifier already spent', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(pool_address);
}

#[test]
fn test_shielded_pool_deposit_transfers_tokens() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    let token = IERC20Dispatcher { contract_address: token_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();

    // Mint tokens to employer
    mock_token.mint(employer, 100_u256);
    assert(token.balance_of(employer) == 100_u256, 'Mint failed');

    // Deposit as dispatcher (pool expects caller == dispatcher)
    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.deposit(employer, 50_u128, 0x111, 0xAA, 0x9001, 0x9001);
    stop_cheat_caller_address(pool_address);

    // Verify balances
    assert(token.balance_of(employer) == 50_u256, 'Employer balance wrong');
    assert(token.balance_of(pool_address) == 50_u256, 'Pool balance wrong');
    assert(pool.is_root_known(0x111), 'Deposit root not registered');
}

#[test]
fn test_shielded_pool_withdraw_transfers_tokens() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    let token = IERC20Dispatcher { contract_address: token_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();
    let employee: ContractAddress = contract_address_const::<0xFF>();

    // Mint and deposit
    mock_token.mint(employer, 100_u256);

    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.deposit(employer, 100_u128, 0x111, 0xAA, 0x9001, 0x9001);

    // Withdraw to employee
    pool.withdraw(0x111, 0xA1, employee, 30_u128, 0x9002, 0x9002);
    stop_cheat_caller_address(pool_address);

    assert(token.balance_of(employee) == 30_u256, 'Employee should have 30');
    assert(token.balance_of(pool_address) == 70_u256, 'Pool should have 70');
    assert(pool.is_nullifier_spent(0xA1), 'Nullifier should be spent');
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_invalid_proof() {
    let (_, _, pool_address, dispatcher_address) = deploy_full_stack();
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };

    let depositor: ContractAddress = contract_address_const::<0xEE>();

    start_cheat_caller_address(pool_address, dispatcher_address);
    match safe_pool.deposit(depositor, 10_u128, 0x123, 0xAB, 0x9004, 0xDEAD) {
        Result::Ok(_) => core::panic_with_felt252('Invalid proof should fail'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Invalid proof', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(pool_address);
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_root_mismatch() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let depositor: ContractAddress = contract_address_const::<0xEE>();
    mock_token.mint(depositor, 100_u256);

    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.deposit(depositor, 10_u128, 0x444, 0xAB, 0x9100, 0x9100);

    match safe_pool.spend(0x999, 0xB1, 0x555, 0xBC, 0x9101, 0x9101) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed unknown root'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Unknown root', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(pool_address);
}

#[test]
#[feature("safe_dispatcher")]
fn test_shielded_pool_rejects_double_spend_with_verifier_path() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    let safe_pool = IShieldedPoolSafeDispatcher { contract_address: pool_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let depositor: ContractAddress = contract_address_const::<0xEE>();
    let recipient: ContractAddress = contract_address_const::<0xFF>();
    mock_token.mint(depositor, 100_u256);

    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.deposit(depositor, 50_u128, 0x777, 0xCD, 0x9200, 0x9200);
    pool.spend(0x777, 0xD1, 0x888, 0xEF, 0x9201, 0x9201);

    match safe_pool.withdraw(0x888, 0xD1, recipient, 5_u128, 0x9202, 0x9202) {
        Result::Ok(_) => core::panic_with_felt252('Should have failed double spend'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Nullifier already spent', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(pool_address);
}

// ── run_payroll integration tests ──

#[test]
fn test_run_payroll_deposits_tokens() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    let token = IERC20Dispatcher { contract_address: token_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();

    // Mint tokens to employer (total: 5 + 2 + 1 = 8)
    mock_token.mint(employer, 8_u256);

    // Build commitment and amount arrays
    let commitments: Array<felt252> = array![0xC1, 0xC2, 0xC3];
    let amounts: Array<u128> = array![5_u128, 2_u128, 1_u128];

    // Run payroll as employer
    start_cheat_caller_address(dispatcher_address, employer);
    let batch_id = dispatcher.run_payroll(0xBA7C4, 3_u32, 8_u128, commitments.span(), amounts.span(), 0x42);
    stop_cheat_caller_address(dispatcher_address);

    // Batch should be queued and executed
    let (batch_hash, total_amount, is_executed, owner) = dispatcher.get_batch(batch_id);
    assert(batch_hash == 0xBA7C4, 'Wrong batch hash');
    assert(total_amount == 8_u128, 'Wrong total');
    assert(is_executed, 'Should be executed');
    assert(owner == employer, 'Wrong owner');

    // Tokens should have moved from employer to pool
    assert(token.balance_of(employer) == 0_u256, 'Employer should have 0');
    assert(token.balance_of(pool_address) == 8_u256, 'Pool should have 8');

    // Commitments should be registered as roots
    assert(pool.is_root_known(0xC1), 'Root C1 not known');
    assert(pool.is_root_known(0xC2), 'Root C2 not known');
    assert(pool.is_root_known(0xC3), 'Root C3 not known');
}

#[test]
fn test_run_payroll_then_withdraw() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    let token = IERC20Dispatcher { contract_address: token_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();
    let employee: ContractAddress = contract_address_const::<0xFF>();

    // Mint and run payroll
    mock_token.mint(employer, 10_u256);

    let commitments: Array<felt252> = array![0xC1, 0xC2];
    let amounts: Array<u128> = array![5_u128, 5_u128];

    start_cheat_caller_address(dispatcher_address, employer);
    dispatcher.run_payroll(0xBA7C4, 2_u32, 10_u128, commitments.span(), amounts.span(), 0x42);
    stop_cheat_caller_address(dispatcher_address);

    // Employee withdraws 5 tokens using root 0xC1
    start_cheat_caller_address(pool_address, dispatcher_address);
    pool.withdraw(0xC1, 0xA1, employee, 5_u128, 0x99, 0x99);
    stop_cheat_caller_address(pool_address);

    assert(token.balance_of(employee) == 5_u256, 'Employee should have 5');
    assert(token.balance_of(pool_address) == 5_u256, 'Pool should have 5');
}

#[test]
#[feature("safe_dispatcher")]
fn test_run_payroll_fails_insufficient_balance() {
    let (token_address, _, _, dispatcher_address) = deploy_full_stack();
    let safe_dispatcher = IPayrollDispatcherSafeDispatcher {
        contract_address: dispatcher_address,
    };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();

    // Mint only 3, but payroll needs 8
    mock_token.mint(employer, 3_u256);

    let commitments: Array<felt252> = array![0xC1, 0xC2, 0xC3];
    let amounts: Array<u128> = array![5_u128, 2_u128, 1_u128];

    start_cheat_caller_address(dispatcher_address, employer);
    match safe_dispatcher.run_payroll(0xBA7C4, 3_u32, 8_u128, commitments.span(), amounts.span(), 0x42) {
        Result::Ok(_) => core::panic_with_felt252('Should fail insufficient bal'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Insufficient balance', *panic_data.at(0));
        },
    };
    stop_cheat_caller_address(dispatcher_address);
}

#[test]
fn test_employee_withdraw_via_dispatcher() {
    let (token_address, _, pool_address, dispatcher_address) = deploy_full_stack();
    let dispatcher = IPayrollDispatcherDispatcher { contract_address: dispatcher_address };
    let token = IERC20Dispatcher { contract_address: token_address };
    let mock_token = IMockERC20Dispatcher { contract_address: token_address };

    let employer: ContractAddress = contract_address_const::<0xEE>();
    let employee: ContractAddress = contract_address_const::<0xFF>();

    // Mint and run payroll (deposit into pool)
    mock_token.mint(employer, 10_u256);

    let commitments: Array<felt252> = array![0xC1, 0xC2];
    let amounts: Array<u128> = array![5_u128, 5_u128];

    start_cheat_caller_address(dispatcher_address, employer);
    dispatcher.run_payroll(0xBA7C4, 2_u32, 10_u128, commitments.span(), amounts.span(), 0x42);
    stop_cheat_caller_address(dispatcher_address);

    // Employee calls employee_withdraw to withdraw 5 tokens
    start_cheat_caller_address(dispatcher_address, employee);
    dispatcher.employee_withdraw(0xC1, 0xA1, 5_u128, 0x42, 0x42);
    stop_cheat_caller_address(dispatcher_address);

    // Employee should have received tokens
    assert(token.balance_of(employee) == 5_u256, 'Employee should have 5');
    assert(token.balance_of(pool_address) == 5_u256, 'Pool should have 5');
}

#[test]
fn test_pool_get_token() {
    let (token_address, _, pool_address, _) = deploy_full_stack();
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };
    assert(pool.get_token() == token_address, 'Wrong token address');
}

#[test]
fn test_pool_deployer_can_set_dispatcher() {
    let token_address = deploy_mock_token();
    let verifier_address = deploy_mock_verifier();
    let pool_address = deploy_pool_raw(token_address, verifier_address);
    let pool = IShieldedPoolDispatcher { contract_address: pool_address };

    // Deployer (test contract) should be able to set dispatcher when it's zero
    let fake_dispatcher: ContractAddress = contract_address_const::<0xDDD>();
    pool.set_dispatcher(fake_dispatcher);

    let (dispatcher_addr, _, _, _, _) = pool.get_state();
    assert(dispatcher_addr == fake_dispatcher, 'Dispatcher not set');
}
