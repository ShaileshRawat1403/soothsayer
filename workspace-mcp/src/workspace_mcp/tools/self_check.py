from __future__ import annotations

import time
from typing import Any, Optional

from .. import __version__
from ..governor import Governor
from ..response_schema import ToolResponse


def self_check(governor: Governor, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()

    decision = governor.validate_action(
        "self_check",
        "read",
        {},
        run_id=run_id,
        owner_id=owner_id,
    )
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    checks: list[dict[str, Any]] = []

    def ok(name: str) -> None:
        checks.append({"name": name, "status": "ok"})

    def err(name: str, msg: str) -> None:
        checks.append({"name": name, "status": "error", "error": msg})

    try:
        _ = governor.config.profile
        _ = governor.config.policy_hash
        ok("policy_loaded")
    except Exception as exc:
        err("policy_loaded", str(exc))

    try:
        for attr in ("runs", "bundles", "audit_logs"):
            store = getattr(governor, attr, None)
            if store is None:
                raise ValueError(f"Missing {attr}")
            if getattr(store, "max_size", 0) <= 0:
                raise ValueError(f"{attr}.max_size must be > 0")
            if getattr(store, "ttl_seconds", 0) <= 0:
                raise ValueError(f"{attr}.ttl_seconds must be > 0")
        ok("bounded_stores")
    except Exception as exc:
        err("bounded_stores", str(exc))

    try:
        meta = governor.get_meta(
            decision.audit_id,
            "self_check",
            "read",
            0,
            run_id=None,
            owner_id=None,
        )
        timestamp = meta.get("timestamp")
        if not isinstance(timestamp, str) or not timestamp.endswith("Z"):
            raise ValueError("timestamp must be ISO8601 UTC ending with 'Z'")
        ok("meta_contract")
    except Exception as exc:
        err("meta_contract", str(exc))

    overall = "ok" if all(item["status"] == "ok" for item in checks) else "error"
    data = {
        "status": overall,
        "kernel_version": __version__,
        "checks": checks,
    }
    duration_ms = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
    return ToolResponse.success(
        summary="Self check completed" if overall == "ok" else "Self check failed",
        data=data,
        meta=governor.get_meta(
            decision.audit_id,
            "self_check",
            "read",
            duration_ms,
            run_id=run_id,
            owner_id=owner_id,
        ),
    )
