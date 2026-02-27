# spec-tests

Language-neutral parity fixtures for Kernel API v1.

## Purpose

- Freeze behavior independent of implementation language.
- Ensure Python reference and Rust parity implementation produce identical outcomes.

## Files

- `bundle_hash_cases.json`: deterministic bundle hashing golden cases
- `meta_contract.json`: canonical meta contract fixtures
- `violation_cases.json`: violation shape/code fixtures
- `run_lifecycle_cases.json`: run lifecycle behavior fixtures

## Runner Contract

Both runners (Python and Rust) MUST:

1. Load the same fixture inputs.
2. Produce normalized JSON outputs.
3. Compare against expected golden outputs exactly.

## Execution Model

- Python runner is the initial reference validator.
- Rust runner is added as parity work begins.
- Rust cutover is blocked until all spec-tests pass.

## Bundle Hash Freezing

Regenerate/freeze bundle hash goldens with:

```bash
python spec-tests/generate_bundle_hashes.py --write
```

Verify goldens without modifying files (CI mode):

```bash
python spec-tests/generate_bundle_hashes.py --check
```
