from __future__ import annotations

import time
from typing import Optional

from .. import __version__
from ..governor import Governor
from ..response_schema import ToolResponse


def kernel_version(governor: Governor, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()

    decision = governor.validate_action(
        "kernel_version",
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

    data = {
        "kernel_version": __version__,
        "contract_version": ToolResponse().contract_version,
        "policy_schema_version": 1,
        "policy_profile": governor.config.profile,
        "policy_hash": governor.config.policy_hash,
        "server_instance_id": governor.server_instance_id,
    }

    duration_ms = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
    return ToolResponse.success(
        summary="Kernel version info",
        data=data,
        meta=governor.get_meta(
            decision.audit_id,
            "kernel_version",
            "read",
            duration_ms,
            run_id=run_id,
            owner_id=owner_id,
        ),
    )
