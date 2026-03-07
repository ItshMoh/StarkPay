global TREE_HEIGHT: u32 = 8;

global DENOMINATION_A: u64 = 1;
global DENOMINATION_B: u64 = 5;
global DENOMINATION_C: u64 = 10;

global DOMAIN_OWNER_KEY: Field = 1_001;
global DOMAIN_NOTE_COMMITMENT: Field = 2_001;
global DOMAIN_NULLIFIER: Field = 3_001;
global DOMAIN_MERKLE_BASE: Field = 4_001;

fn mix(state: Field, value: Field, round_constant: Field) -> Field {
    let x = state + value + round_constant + 17;
    x * (x + 23)
}

fn hash_one(value: Field, domain: Field) -> Field {
    let mut state = domain;
    state = mix(state, value, 1);
    mix(state, domain, 2)
}

fn hash_two(left: Field, right: Field, domain: Field) -> Field {
    let mut state = domain;
    state = mix(state, left, 3);
    state = mix(state, right, 5);
    mix(state, domain, 7)
}

fn hash_four(a: Field, b: Field, c: Field, d: Field, domain: Field) -> Field {
    let mut state = domain;
    state = mix(state, a, 11);
    state = mix(state, b, 13);
    state = mix(state, c, 17);
    state = mix(state, d, 19);
    mix(state, domain, 23)
}

fn assert_supported_denomination(amount: u64) {
    assert((amount == DENOMINATION_A) | (amount == DENOMINATION_B) | (amount == DENOMINATION_C));
}

fn compute_owner_pubkey(owner_secret: Field) -> Field {
    hash_one(owner_secret, DOMAIN_OWNER_KEY)
}

fn compute_note_commitment(note_secret: Field, owner_pubkey: Field, amount: u64, note_nonce: Field) -> Field {
    hash_four(
        note_secret,
        owner_pubkey,
        amount as Field,
        note_nonce,
        DOMAIN_NOTE_COMMITMENT,
    )
}

fn compute_nullifier(note_secret: Field, note_nonce: Field) -> Field {
    hash_two(note_secret, note_nonce, DOMAIN_NULLIFIER)
}

fn compute_merkle_root(
    leaf: Field,
    siblings: [Field; TREE_HEIGHT],
    path_indices: [u8; TREE_HEIGHT],
) -> Field {
    let mut current = leaf;

    for i in 0..TREE_HEIGHT {
        let direction = path_indices[i];
        assert((direction == 0_u8) | (direction == 1_u8));

        let level_domain = DOMAIN_MERKLE_BASE + i as Field;
        if direction == 0_u8 {
            current = hash_two(current, siblings[i], level_domain);
        } else {
            current = hash_two(siblings[i], current, level_domain);
        }
    }

    current
}

fn main(
    merkle_root: pub Field,
    nullifier: pub Field,
    new_commitment: pub Field,
    owner_secret: Field,
    note_secret: Field,
    note_nonce: Field,
    amount: u64,
    merkle_siblings: [Field; TREE_HEIGHT],
    merkle_path_indices: [u8; TREE_HEIGHT],
    new_note_secret: Field,
    new_note_nonce: Field,
    recipient_pubkey: Field,
) {
    assert_supported_denomination(amount);

    // Spend authorization: prover must know the owner secret bound into the input note.
    let owner_pubkey = compute_owner_pubkey(owner_secret);

    // Input note commitment and inclusion path must resolve to a known root.
    let input_note_commitment = compute_note_commitment(note_secret, owner_pubkey, amount, note_nonce);
    let computed_root = compute_merkle_root(
        input_note_commitment,
        merkle_siblings,
        merkle_path_indices,
    );
    assert(computed_root == merkle_root);

    // Nullifier must match the spent note secret/nonce pair to prevent double-spend.
    let computed_nullifier = compute_nullifier(note_secret, note_nonce);
    assert(computed_nullifier == nullifier);

    // Output note commitment must be consistent with recipient and denomination-preserved amount.
    let computed_new_commitment = compute_note_commitment(
        new_note_secret,
        recipient_pubkey,
        amount,
        new_note_nonce,
    );
    assert(computed_new_commitment == new_commitment);
}

fn valid_fixture() -> (
    Field,
    Field,
    Field,
    Field,
    Field,
    Field,
    u64,
    [Field; TREE_HEIGHT],
    [u8; TREE_HEIGHT],
    Field,
    Field,
    Field,
) {
    let owner_secret = 101;
    let note_secret = 202;
    let note_nonce = 303;
    let amount = 5;

    let siblings = [11, 22, 33, 44, 55, 66, 77, 88];
    let path_indices = [0_u8, 1_u8, 0_u8, 1_u8, 0_u8, 0_u8, 1_u8, 1_u8];

    let new_note_secret = 404;
    let new_note_nonce = 505;
    let recipient_pubkey = 606;

    let owner_pubkey = compute_owner_pubkey(owner_secret);
    let input_note_commitment = compute_note_commitment(note_secret, owner_pubkey, amount, note_nonce);
    let merkle_root = compute_merkle_root(input_note_commitment, siblings, path_indices);
    let nullifier = compute_nullifier(note_secret, note_nonce);
    let new_commitment = compute_note_commitment(
        new_note_secret,
        recipient_pubkey,
        amount,
        new_note_nonce,
    );

    (
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    )
}

#[test]
fn accepts_valid_spend_vector() {
    let (
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    ) = valid_fixture();

    main(
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    );
}

#[test(should_fail)]
fn rejects_unsupported_denomination() {
    let (
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        _,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    ) = valid_fixture();

    main(
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        2,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    );
}

#[test(should_fail)]
fn rejects_invalid_merkle_proof() {
    let (
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    ) = valid_fixture();

    let mut wrong_siblings = siblings;
    wrong_siblings[3] = wrong_siblings[3] + 1;

    main(
        merkle_root,
        nullifier,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        wrong_siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    );
}

#[test(should_fail)]
fn rejects_invalid_nullifier() {
    let (
        merkle_root,
        _,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    ) = valid_fixture();

    main(
        merkle_root,
        999_999,
        new_commitment,
        owner_secret,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    );
}

#[test(should_fail)]
fn rejects_wrong_owner_secret() {
    let (
        merkle_root,
        nullifier,
        new_commitment,
        _,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    ) = valid_fixture();

    main(
        merkle_root,
        nullifier,
        new_commitment,
        102,
        note_secret,
        note_nonce,
        amount,
        siblings,
        path_indices,
        new_note_secret,
        new_note_nonce,
        recipient_pubkey,
    );
}
