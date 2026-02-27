# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
### Changed
### Fixed
### Security

## [0.1.2] - 2026-02-27
### Added
- Added `kernel_version` tool for deterministic client handshake data.
- Added `self_check` tool for runtime sanity checks (`policy_loaded`, `bounded_stores`, `meta_contract`).
- Added contract snapshot tests for new kernel tools.

## [0.1.1] - 2026-02-27
### Changed
- Enforced response contract alignment: `meta.code` now always matches top-level `code`.

### Added
- Contract snapshot tests for code alignment across success and blocked responses.

## [0.1.0] - 2026-02-27
### Added
- Deterministic Kernel API v1: run lifecycle (OPT-IN run_id), bundles, explainability
- Owner scoping via UNSALTED owner_id hash (enforced when run_id or bundle_id present)
- Policy layering: packaged kernel policy + optional project overlay
- Bounded stores with TTL + max_size for runs, bundles, and audit logs
- Deterministic bundle_id hashing via canonical JSON over normalized diff + targets + policy_hash
- ISO8601 UTC timestamps in response meta
- Packaging: pyproject.toml, src layout, console script entrypoint `workspace-mcp`
- Tests migrated and passing (26 tests), ruff + mypy passing

### Changed
- Server initialization moved into package-safe `main()` entrypoint

### Security
- Salted args hashing in audit logs to reduce reconstruction risk
