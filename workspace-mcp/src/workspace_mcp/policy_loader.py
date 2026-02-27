from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping
import importlib.resources as pkg_resources

import yaml

from .config import PolicyConfig

ALLOWED_TOP_KEYS = {"version", "profiles"}
ALLOWED_PROFILE_KEYS = {
    "allow_paths",
    "deny_globs",
    "allow_tasks",
    "max_file_bytes",
    "max_runtime_seconds",
    "max_output_bytes",
    "max_runs",
    "run_ttl_seconds",
    "max_bundles",
    "bundle_ttl_seconds",
    "max_audit_logs",
    "audit_ttl_seconds",
    "risk_rules",
}
ALLOWED_RISK_RULE_KEYS = {"high_globs", "medium_globs", "low_globs"}


@dataclass(frozen=True)
class EffectivePolicy:
    profile: str
    data: PolicyConfig


def _load_yaml_path(path: Path) -> dict[str, Any]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"Policy must be a mapping: {path}")
    return raw


def _load_kernel_policy() -> dict[str, Any]:
    with pkg_resources.files("workspace_mcp.policies").joinpath("kernel_policy.yaml").open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    if not isinstance(raw, dict):
        raise ValueError("Kernel policy must be a mapping")
    return raw


def _deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _require_type(name: str, value: Any, t: type) -> None:
    if not isinstance(value, t):
        raise ValueError(f"Invalid type for '{name}': expected {t.__name__}")


def _validate_profile(profile_name: str, prof: Mapping[str, Any], *, strict: bool) -> None:
    _require_type(f"profiles.{profile_name}", prof, dict)

    if strict:
        unknown = set(prof.keys()) - ALLOWED_PROFILE_KEYS
        if unknown:
            raise ValueError(f"Unknown keys in profile '{profile_name}': {sorted(unknown)}")

    required = [
        "allow_paths", "deny_globs", "allow_tasks",
        "max_file_bytes", "max_runtime_seconds", "max_output_bytes",
        "max_runs", "run_ttl_seconds", "max_bundles", "bundle_ttl_seconds",
        "max_audit_logs", "audit_ttl_seconds",
        "risk_rules",
    ]
    for key in required:
        if key not in prof:
            raise ValueError(f"Missing required key in profile '{profile_name}': {key}")

    _require_type("allow_paths", prof["allow_paths"], list)
    _require_type("deny_globs", prof["deny_globs"], list)
    _require_type("allow_tasks", prof["allow_tasks"], dict)

    for task_name, argv in prof["allow_tasks"].items():
        if not isinstance(task_name, str):
            raise ValueError("allow_tasks keys must be strings")
        if not isinstance(argv, list) or not all(isinstance(x, str) for x in argv):
            raise ValueError(f"allow_tasks['{task_name}'] must be a list[str]")

    for key in [
        "max_file_bytes", "max_runtime_seconds", "max_output_bytes",
        "max_runs", "run_ttl_seconds", "max_bundles", "bundle_ttl_seconds",
        "max_audit_logs", "audit_ttl_seconds",
    ]:
        if not isinstance(prof[key], int) or prof[key] < 0:
            raise ValueError(f"{key} must be a non-negative integer")

    rr = prof["risk_rules"]
    _require_type("risk_rules", rr, dict)
    if strict:
        unknown_rr = set(rr.keys()) - ALLOWED_RISK_RULE_KEYS
        if unknown_rr:
            raise ValueError(f"Unknown keys in risk_rules for '{profile_name}': {sorted(unknown_rr)}")

    for rrk in ["high_globs", "medium_globs", "low_globs"]:
        if rrk not in rr:
            raise ValueError(f"Missing risk_rules key in '{profile_name}': {rrk}")
        if not isinstance(rr[rrk], list) or not all(isinstance(x, str) for x in rr[rrk]):
            raise ValueError(f"risk_rules.{rrk} must be list[str]")


def load_effective_policy(*, profile: str, project_policy_path: Path | None, strict: bool) -> EffectivePolicy:
    kernel = _load_kernel_policy()
    overlay = _load_yaml_path(project_policy_path) if project_policy_path else {}
    merged = _deep_merge(kernel, overlay)

    if strict:
        unknown_top = set(merged.keys()) - ALLOWED_TOP_KEYS
        if unknown_top:
            raise ValueError(f"Unknown top-level policy keys: {sorted(unknown_top)}")

    profiles = merged.get("profiles")
    if not isinstance(profiles, dict):
        raise ValueError("Policy must contain 'profiles' mapping")

    if profile not in profiles:
        raise ValueError(f"Profile not found in policy: {profile}")

    prof = profiles[profile]
    _validate_profile(profile, prof, strict=strict)

    cfg = PolicyConfig.from_mapping(profile=profile, policy=prof)
    return EffectivePolicy(profile=profile, data=cfg)
