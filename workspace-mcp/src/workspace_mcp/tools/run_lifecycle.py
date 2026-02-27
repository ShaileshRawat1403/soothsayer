import time
import uuid
import hashlib
from typing import Dict, Any, Optional
from ..governor import Governor
from ..response_schema import ToolResponse

def start_run(governor: Governor, metadata: Optional[Dict[str, Any]] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()
    
    audit_id = str(uuid.uuid4())
    if not owner_id:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="start_run",
            risk="write",
            decision="blocked",
            code="blocked",
            arg_hash=governor._hash_args({"metadata": metadata}),
            violation={"key": "OWNER_ID_REQUIRED", "details": {}, "config_path": ""},
            duration_ms=duration
        )
        return ToolResponse.blocked(
            reason="OWNER_ID_REQUIRED",
            policy_violation={"key": "OWNER_ID_REQUIRED", "details": {}, "config_path": ""},
            meta=governor.get_meta(audit_id, "start_run", "write", duration)
        )
    
    run_id = str(uuid.uuid4())
    owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    
    run_data = {
        "run_id": run_id,
        "owner_hash": owner_hash,
        "metadata": metadata or {},
        "start_time": start_time,
        "end_time": None,
        "status": "active",
        "tool_sequence": [],
        "risk_distribution": {},
        "allowed_count": 0,
        "blocked_count": 0,
    }
    
    governor.runs.set(run_id, run_data)
    
    duration = int((time.time() - start_time) * 1000)
    meta = governor.get_meta(audit_id, "start_run", "write", duration, run_id=run_id, owner_id=owner_id)
    meta["decision"] = "allowed"
    meta["code"] = "success"
    
    governor._log_audit(
        audit_id=audit_id,
        tool="start_run",
        risk="write",
        decision="allowed",
        code="success",
        arg_hash=governor._hash_args({"metadata": metadata}),
        violation=None,
        run_id=run_id,
        owner_id=owner_id,
        duration_ms=duration
    )
    
    return ToolResponse.success(
        summary=f"Started run {run_id}",
        data={"run_id": run_id},
        meta=meta
    )

def end_run(governor: Governor, run_id: str, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()
    
    audit_id = str(uuid.uuid4())
    if not owner_id:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="end_run",
            risk="write",
            decision="blocked",
            code="blocked",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "OWNER_ID_REQUIRED", "details": {"run_id": run_id}, "config_path": ""},
            duration_ms=duration
        )
        return ToolResponse.blocked(
            reason="OWNER_ID_REQUIRED",
            policy_violation={"key": "OWNER_ID_REQUIRED", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "end_run", "write", duration)
        )
        
    run = governor.runs.get(run_id)
    if not run:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="end_run",
            risk="write",
            decision="error",
            code="not_found",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            owner_id=owner_id,
            duration_ms=duration
        )
        return ToolResponse.error(
            "Run not found", 
            code="not_found", 
            details={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "end_run", "write", duration)
        )
        
    owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    if run.get("owner_hash") != owner_hash:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="end_run",
            risk="write",
            decision="error",
            code="not_found",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            owner_id=owner_id,
            duration_ms=duration
        )
        return ToolResponse.error(
            "Run not found", 
            code="not_found", 
            details={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "end_run", "write", duration)
        )
        
    if run.get("status") == "ended":
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="end_run",
            risk="write",
            decision="error",
            code="invalid_input",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "RUN_ALREADY_ENDED", "details": {"run_id": run_id}, "config_path": ""},
            run_id=run_id,
            owner_id=owner_id,
            duration_ms=duration
        )
        return ToolResponse.error(
            "Run already ended", 
            code="invalid_input", 
            details={"key": "RUN_ALREADY_ENDED", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "end_run", "write", duration)
        )
        
    run["end_time"] = time.time()
    run["status"] = "ended"
    governor.runs.set(run_id, run) # Update last_seen_at
        
    duration = int((time.time() - start_time) * 1000)
    meta = governor.get_meta(audit_id, "end_run", "write", duration, run_id=run_id, owner_id=owner_id)
    meta["decision"] = "allowed"
    meta["code"] = "success"
    
    governor._log_audit(
        audit_id=audit_id,
        tool="end_run",
        risk="write",
        decision="allowed",
        code="success",
        arg_hash=governor._hash_args({"run_id": run_id}),
        violation=None,
        run_id=run_id,
        owner_id=owner_id,
        duration_ms=duration
    )
    
    return ToolResponse.success(
        summary=f"Ended run {run_id}",
        data={"run_id": run_id, "duration_seconds": round(run["end_time"] - run["start_time"], 2)},
        meta=meta
    )

def get_run_summary(governor: Governor, run_id: str, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()
    
    audit_id = str(uuid.uuid4())
    if not owner_id:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="get_run_summary",
            risk="read",
            decision="blocked",
            code="blocked",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "OWNER_ID_REQUIRED", "details": {"run_id": run_id}, "config_path": ""},
            duration_ms=duration
        )
        return ToolResponse.blocked(
            reason="OWNER_ID_REQUIRED",
            policy_violation={"key": "OWNER_ID_REQUIRED", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "get_run_summary", "read", duration)
        )
        
    run = governor.runs.get(run_id)
    if not run:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="get_run_summary",
            risk="read",
            decision="error",
            code="not_found",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            owner_id=owner_id,
            duration_ms=duration
        )
        return ToolResponse.error(
            "Run not found", 
            code="not_found", 
            details={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "get_run_summary", "read", duration)
        )
        
    owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    if run.get("owner_hash") != owner_hash:
        duration = int((time.time() - start_time) * 1000)
        governor._log_audit(
            audit_id=audit_id,
            tool="get_run_summary",
            risk="read",
            decision="error",
            code="not_found",
            arg_hash=governor._hash_args({"run_id": run_id}),
            violation={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            owner_id=owner_id,
            duration_ms=duration
        )
        return ToolResponse.error(
            "Run not found", 
            code="not_found", 
            details={"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""},
            meta=governor.get_meta(audit_id, "get_run_summary", "read", duration)
        )
        
    duration_s = None
    if run.get("end_time") is not None:
        duration_s = run["end_time"] - run["start_time"]
    else:
        duration_s = time.time() - run["start_time"]
        
    summary_data = {
        "run_id": run["run_id"],
        "metadata": run["metadata"],
        "tool_sequence": run["tool_sequence"],
        "risk_distribution": run["risk_distribution"],
        "allowed_count": run["allowed_count"],
        "blocked_count": run["blocked_count"],
        "status": run["status"],
        "duration_seconds": round(duration_s, 2) if duration_s is not None else None
    }
    
    duration = int((time.time() - start_time) * 1000)
    meta = governor.get_meta(audit_id, "get_run_summary", "read", duration, run_id=run_id, owner_id=owner_id)
    meta["decision"] = "allowed"
    meta["code"] = "success"
    
    governor._log_audit(
        audit_id=audit_id,
        tool="get_run_summary",
        risk="read",
        decision="allowed",
        code="success",
        arg_hash=governor._hash_args({"run_id": run_id}),
        violation=None,
        run_id=run_id,
        owner_id=owner_id,
        duration_ms=duration
    )
    
    return ToolResponse.success(
        summary=f"Summary for run {run_id}",
        data=summary_data,
        meta=meta
    )
