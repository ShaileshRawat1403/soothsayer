import sys
import time
from typing import Optional
from ..governor import Governor
from ..response_schema import ToolResponse

def workspace_info(governor: Governor, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    """
    Returns metadata about the configured workspace.
    """
    start_time = time.time()
    # Governor Check
    decision = governor.validate_action("workspace_info", "read", {}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")
    duration_ms = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
    return ToolResponse.success(
        summary="Workspace configuration retrieved",
        data={
            "workspace_root": str(governor.root),
            "python_version": sys.version,
            "allowed_tasks": list(governor.config.allow_tasks.keys()),
            "limits": {
                "max_file_bytes": governor.config.max_file_bytes,
                "max_runtime_seconds": governor.config.max_runtime_seconds
            }
        },
        meta=governor.get_meta(decision.audit_id, "workspace_info", "read", duration_ms, run_id=run_id, owner_id=owner_id)
    )
