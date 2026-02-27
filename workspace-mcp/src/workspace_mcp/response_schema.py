from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Literal, Optional

CANONICAL_META_KEYS = {
    "audit_id",
    "tool",
    "risk",
    "decision",
    "code",
    "duration_ms",
    "run_id",
    "run_counter",
    "policy_hash",
    "policy_profile",
    "server_instance_id",
    "output_truncated",
    "timestamp",
}


@dataclass(slots=True)
class ToolResponse:
    """
    Standardized response schema for all tool executions.
    """
    contract_version: str = "1.1"
    status: Literal["ok", "blocked", "error"] = "error"
    code: Literal["success", "invalid_input", "not_found", "blocked", "tool_failed", "timeout"] = "tool_failed"
    summary: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    next_suggested_actions: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def model_dump(self) -> Dict[str, Any]:
        out = asdict(self)
        # Stability rule: meta.code must always match top-level code.
        meta = out.get("meta")
        if isinstance(meta, dict):
            meta["code"] = out.get("code")
            if set(meta.keys()) != CANONICAL_META_KEYS:
                raise RuntimeError(
                    f"Meta contract drift detected. Expected keys={CANONICAL_META_KEYS}, got={set(meta.keys())}"
                )
        return out

    def model_dump_json(self) -> str:
        return json.dumps(self.model_dump(), ensure_ascii=False)

    @classmethod
    def success(cls, summary: str, data: Dict[str, Any] | None = None, meta: Dict[str, Any] | None = None) -> "ToolResponse":
        return cls(status="ok", code="success", summary=summary, data=data or {}, meta=meta or {})

    @classmethod
    def blocked(cls, reason: str, policy_violation: str | Dict[str, Any], meta: Dict[str, Any] | None = None) -> "ToolResponse":
        return cls(
            status="blocked",
            code="blocked",
            summary=f"Action blocked: {reason}",
            data={"policy_violation": policy_violation},
            meta=meta or {}
        )

    @classmethod
    def error(cls, message: str, code: Literal["invalid_input", "not_found", "blocked", "tool_failed", "timeout"] = "tool_failed", details: Dict[str, Any] | None = None, meta: Dict[str, Any] | None = None) -> "ToolResponse":
        return cls(status="error", code=code, summary=message, data=details or {}, meta=meta or {})

DecisionKind = Literal["allowed", "blocked", "error"]
RiskLevel = Literal["read", "write", "execute", "network"]

Violation = Dict[str, Any]  # Must be {"key": str, "details": dict, "config_path": str}

@dataclass(frozen=True)
class Decision:
    audit_id: str
    tool: str
    risk: RiskLevel
    decision: DecisionKind  # allowed|blocked|error
    code: str               # success|blocked|invalid_input|not_found|tool_failed|timeout
    violation: Optional[Violation] = None
    block_response: Optional[ToolResponse] = None

    @property
    def allowed(self) -> bool:
        return self.decision == "allowed"
