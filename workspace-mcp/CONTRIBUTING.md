# Contributing

## Scope

`workspace-mcp` is currently in reference-kernel mode.

- Python (`0.1.x`) is the reference implementation.
- Rust parity is the replacement track.

## Freeze Policy (Python 0.1.x)

Allowed:
- bug fixes
- docs/spec clarifications
- spec-test additions
- packaging/CI hygiene

Not allowed:
- new tools
- policy feature expansion
- response/meta schema changes
- behavior changes that alter deterministic outputs

## Required Checks

From `workspace-mcp/` run before opening a PR:

```bash
python spec-tests/generate_bundle_hashes.py --check
pytest -q
ruff check .
mypy src
```

## Spec and Parity

- `docs/KERNEL_API_V1.md` defines normative behavior.
- `spec-tests/` fixtures are language-neutral parity anchors.
- Rust cutover requires passing all spec-tests.
