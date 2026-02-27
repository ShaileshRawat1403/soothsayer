from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping
import hashlib
import json
import os

import yaml


@dataclass(frozen=True)
class PolicyConfig:
    workspace_root: str = "."
    allow_paths: list[str] = field(default_factory=lambda: ["."])
    deny_globs: list[str] = field(default_factory=list)
    allow_tasks: dict[str, list[str]] = field(default_factory=dict)
    profile: str = "dev"
    policy_hash: str = ""
    max_file_bytes: int = 200000
    max_runtime_seconds: int = 15
    max_output_bytes: int = 50000
    max_runs: int = 50
    run_ttl_seconds: int = 3600
    max_bundles: int = 50
    bundle_ttl_seconds: int = 3600
    max_audit_logs: int = 100
    audit_ttl_seconds: int = 86400
    risk_rules: dict[str, list[str]] = field(default_factory=lambda: {
        "high_globs": ["*config*", "*.yaml", "*.json", ".env*", "*policy*"],
        "medium_globs": ["*.py", "*.ts", "*.js", "*.sh"],
        "low_globs": ["*"],
    })

    @staticmethod
    def _sha256_canonical(obj: Any) -> str:
        payload = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def from_mapping(cls, *, profile: str, policy: Mapping[str, Any]) -> "PolicyConfig":
        risk = policy["risk_rules"]
        risk_rules = {
            "high_globs": list(risk["high_globs"]),
            "medium_globs": list(risk["medium_globs"]),
            "low_globs": list(risk["low_globs"]),
        }

        policy_hash = cls._sha256_canonical(
            {
                "version": 1,
                "profile": profile,
                "policy": {
                    "allow_paths": list(policy["allow_paths"]),
                    "deny_globs": list(policy["deny_globs"]),
                    "allow_tasks": dict(policy["allow_tasks"]),
                    "max_file_bytes": int(policy["max_file_bytes"]),
                    "max_runtime_seconds": int(policy["max_runtime_seconds"]),
                    "max_output_bytes": int(policy["max_output_bytes"]),
                    "max_runs": int(policy["max_runs"]),
                    "run_ttl_seconds": int(policy["run_ttl_seconds"]),
                    "max_bundles": int(policy["max_bundles"]),
                    "bundle_ttl_seconds": int(policy["bundle_ttl_seconds"]),
                    "max_audit_logs": int(policy["max_audit_logs"]),
                    "audit_ttl_seconds": int(policy["audit_ttl_seconds"]),
                    "risk_rules": {
                        "high_globs": list(risk_rules["high_globs"]),
                        "medium_globs": list(risk_rules["medium_globs"]),
                        "low_globs": list(risk_rules["low_globs"]),
                    },
                },
            }
        )

        return cls(
            workspace_root=".",
            profile=profile,
            policy_hash=policy_hash,
            allow_paths=list(policy["allow_paths"]),
            deny_globs=list(policy["deny_globs"]),
            allow_tasks={str(k): list(v) for k, v in dict(policy["allow_tasks"]).items()},
            max_file_bytes=int(policy["max_file_bytes"]),
            max_runtime_seconds=int(policy["max_runtime_seconds"]),
            max_output_bytes=int(policy["max_output_bytes"]),
            max_runs=int(policy["max_runs"]),
            run_ttl_seconds=int(policy["run_ttl_seconds"]),
            max_bundles=int(policy["max_bundles"]),
            bundle_ttl_seconds=int(policy["bundle_ttl_seconds"]),
            max_audit_logs=int(policy["max_audit_logs"]),
            audit_ttl_seconds=int(policy["audit_ttl_seconds"]),
            risk_rules=risk_rules,
        )


@dataclass(frozen=True)
class RuntimeConfig:
    workspace_root: Path
    policy_path: Path | None
    profile: str
    strict: bool


def _read_yaml_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Config must be a mapping: {path}")
    return data


def load_runtime_config(
    *,
    cli: Mapping[str, Any],
    env: Mapping[str, str] | None = None,
    config_file: Path | None = None,
) -> RuntimeConfig:
    """Precedence: CLI > env vars > config file > defaults."""
    env = env or os.environ

    defaults: dict[str, Any] = {
        "workspace_root": Path.cwd(),
        "policy_path": None,
        "profile": "dev",
        "strict": False,
    }

    file_data: dict[str, Any] = {}
    if config_file is not None:
        file_data = _read_yaml_file(config_file)

    env_data: dict[str, Any] = {
        "workspace_root": env.get("WORKSPACE_ROOT"),
        "policy_path": env.get("POLICY_PATH"),
        "profile": env.get("PROFILE"),
        "strict": env.get("STRICT_MODE"),
    }

    def norm_path(v: Any) -> Path | None:
        if v is None or v == "":
            return None
        return Path(str(v)).expanduser()

    def norm_bool(v: Any) -> bool | None:
        if v is None or v == "":
            return None
        if isinstance(v, bool):
            return v
        s = str(v).strip().lower()
        if s in {"1", "true", "yes", "y", "on"}:
            return True
        if s in {"0", "false", "no", "n", "off"}:
            return False
        raise ValueError(f"Invalid boolean value: {v}")

    merged = dict(defaults)

    if file_data:
        merged.update({k: v for k, v in file_data.items() if v is not None})

    env_layer: dict[str, Any] = {}
    if env_data["workspace_root"] is not None:
        env_layer["workspace_root"] = norm_path(env_data["workspace_root"])
    if env_data["policy_path"] is not None:
        env_layer["policy_path"] = norm_path(env_data["policy_path"])
    if env_data["profile"] is not None:
        env_layer["profile"] = str(env_data["profile"])
    if env_data["strict"] is not None:
        env_layer["strict"] = norm_bool(env_data["strict"])
    merged.update(env_layer)

    cli_layer: dict[str, Any] = {}
    if cli.get("workspace_root") is not None:
        cli_layer["workspace_root"] = norm_path(cli["workspace_root"])
    if cli.get("policy_path") is not None:
        cli_layer["policy_path"] = norm_path(cli["policy_path"])
    if cli.get("profile") is not None:
        cli_layer["profile"] = str(cli["profile"])
    if cli.get("strict") is not None:
        cli_layer["strict"] = bool(cli["strict"])
    if cli_layer:
        merged.update(cli_layer)

    workspace_root = merged["workspace_root"]
    if not isinstance(workspace_root, Path):
        workspace_root = norm_path(workspace_root) or Path.cwd()

    policy_path = merged["policy_path"]
    if policy_path is not None and not isinstance(policy_path, Path):
        policy_path = norm_path(policy_path)

    profile = str(merged["profile"] or "dev")
    strict = bool(merged["strict"])

    if profile not in {"dev", "ci", "read_only"}:
        raise ValueError(f"Invalid profile: {profile}")

    return RuntimeConfig(
        workspace_root=workspace_root.resolve(),
        policy_path=policy_path.resolve() if policy_path else None,
        profile=profile,
        strict=strict,
    )
