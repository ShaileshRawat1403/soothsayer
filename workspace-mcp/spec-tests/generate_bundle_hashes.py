#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

# Reuse kernel canonical normalization to avoid divergence.
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from workspace_mcp.tools.change_bundle import normalize_diff_text  # noqa: E402


def _canonical_bundle_id(*, diff_text: str, target_files: list[str], policy_hash: str, contract_version: str) -> str:
    normalized_diff = normalize_diff_text(diff_text)
    normalized_targets = sorted(Path(path).as_posix() for path in target_files)
    canonical_payload = {
        "contract_version": contract_version,
        "policy_hash": policy_hash,
        "target_files": normalized_targets,
        "diff": normalized_diff,
    }
    canonical_json = json.dumps(canonical_payload, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def _compute_cases(doc: dict[str, Any]) -> dict[str, Any]:
    algorithm = doc.get("algorithm", {})
    default_contract_version = str(algorithm.get("contract_version", "1.1"))

    for case in doc.get("cases", []):
        contract_version = str(case.get("contract_version", default_contract_version))
        diff_text = str(case.get("diff_text", case.get("diff", "")))
        target_files = case.get("target_files", [])
        policy_hash = str(case.get("policy_hash", ""))

        case["expected_bundle_id"] = _canonical_bundle_id(
            diff_text=diff_text,
            target_files=target_files,
            policy_hash=policy_hash,
            contract_version=contract_version,
        )

    return doc


def _check_cases(doc: dict[str, Any]) -> tuple[bool, list[str]]:
    algorithm = doc.get("algorithm", {})
    default_contract_version = str(algorithm.get("contract_version", "1.1"))
    mismatches: list[str] = []

    for case in doc.get("cases", []):
        contract_version = str(case.get("contract_version", default_contract_version))
        diff_text = str(case.get("diff_text", case.get("diff", "")))
        target_files = case.get("target_files", [])
        policy_hash = str(case.get("policy_hash", ""))
        expected = str(case.get("expected_bundle_id", ""))

        actual = _canonical_bundle_id(
            diff_text=diff_text,
            target_files=target_files,
            policy_hash=policy_hash,
            contract_version=contract_version,
        )
        if actual != expected:
            mismatches.append(
                f"- {case.get('name', '<unnamed>')}: expected={expected} actual={actual}"
            )

    return (len(mismatches) == 0, mismatches)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate/freeze deterministic bundle hash golden values."
    )
    parser.add_argument(
        "--cases-file",
        default=str(ROOT / "spec-tests" / "bundle_hash_cases.json"),
        help="Path to bundle_hash_cases.json",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write updated expected_bundle_id values in place.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify expected_bundle_id values and exit non-zero on drift.",
    )
    parser.add_argument(
        "--print",
        action="store_true",
        help="Print computed JSON to stdout (default for generate mode).",
    )
    args = parser.parse_args()

    cases_path = Path(args.cases_file)
    payload = json.loads(cases_path.read_text(encoding="utf-8"))
    if args.check or not args.write:
        ok, mismatches = _check_cases(payload)
        if not ok:
            print("Bundle hash drift detected:", file=sys.stderr)
            for line in mismatches:
                print(line, file=sys.stderr)
            print(
                "Run with --write to refresh golden hashes intentionally.",
                file=sys.stderr,
            )
            return 1
        print("bundle_hash_cases.json is in sync.")
        if args.check:
            return 0

    updated = _compute_cases(payload)
    rendered = json.dumps(updated, indent=2, ensure_ascii=False) + "\n"
    if args.write:
        cases_path.write_text(rendered, encoding="utf-8")
        print(f"Updated {cases_path}.")
    elif args.print:
        print(rendered, end="")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
