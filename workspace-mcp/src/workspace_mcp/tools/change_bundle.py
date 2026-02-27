import time
import re
import hashlib
import json
from typing import Dict, Any, Optional
from ..governor import Governor
from ..response_schema import ToolResponse
from ..path_safety import resolve_path, validate_path, PathSafetyError

def normalize_diff_text(diff_text: str) -> str:
    text = diff_text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)

def create_change_bundle(governor: Governor, diff_text: str, metadata: Optional[Dict[str, Any]] = None, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()

    path_regex = re.compile(r'^(?:\+\+\+|---) (?:[ab]/)?(.+)$', re.MULTILINE)
    matches = path_regex.findall(diff_text)
    parsed_targets = [target.strip() for target in matches if target != "/dev/null"]

    # Check write risk for bundle creation
    decision = governor.validate_action("create_change_bundle", "write", {"diff_size": len(diff_text), "paths": parsed_targets}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    target_files = set()
    
    if not matches:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error("Could not parse any target paths from diff", code="invalid_input", meta=governor.get_meta(decision.audit_id, "create_change_bundle", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
        
    try:
        for target in matches:
            if target == "/dev/null":
                continue
            clean_target = target.strip()
            safe_path = resolve_path(governor.root, clean_target)
            validate_path(safe_path, governor.root, governor.config.deny_globs, governor.config.allow_paths)
            target_files.add(str(safe_path.relative_to(governor.root)).replace("\\", "/"))
    except PathSafetyError as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Patch targets unsafe file", {"key": "PATH_OUTSIDE_ALLOW_PATHS", "details": {"error": str(e)}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "create_change_bundle", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

    normalized_diff = normalize_diff_text(diff_text)
    sorted_targets = sorted(list(target_files))
    
    canonical_payload = {
        "contract_version": "1.1",
        "policy_hash": governor.config_hash,
        "target_files": sorted_targets,
        "diff": normalized_diff
    }
    canonical_json = json.dumps(canonical_payload, separators=(",", ":"), sort_keys=True)
    bundle_id = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
    
    existing_bundle = governor.bundles.get(bundle_id)
    if existing_bundle:
        duration = int((time.time() - start_time) * 1000)
        governor.update_audit(decision.audit_id, {"duration_ms": duration})
        return ToolResponse.success(
            summary=f"Returned existing change bundle {bundle_id}",
            data={"bundle_id": bundle_id, "target_files": existing_bundle["target_files"]},
            meta=governor.get_meta(decision.audit_id, "create_change_bundle", "write", duration, run_id=run_id, owner_id=owner_id)
        )
        
    bundle_data = {
        "bundle_id": bundle_id,
        "diff_text": normalized_diff,
        "metadata": metadata or {},
        "target_files": sorted_targets,
        "created_at": start_time
    }
    if owner_id:
        bundle_data["owner_hash"] = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
        
    governor.bundles.set(bundle_id, bundle_data)
    
    duration = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration})
    return ToolResponse.success(
        summary=f"Created change bundle {bundle_id}",
        data={"bundle_id": bundle_id, "target_files": sorted_targets},
        meta=governor.get_meta(decision.audit_id, "create_change_bundle", "write", duration, run_id=run_id, owner_id=owner_id)
    )

def bundle_report(governor: Governor, bundle_id: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()
    
    decision = governor.validate_action("bundle_report", "read", {"bundle_id": bundle_id}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")
    
    bundle = governor.bundles.get(bundle_id)
    if not bundle:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(
            "Bundle not found", 
            code="not_found", 
            details={"key": "BUNDLE_NOT_FOUND", "details": {"bundle_id": bundle_id}, "config_path": ""},
            meta=governor.get_meta(decision.audit_id, "bundle_report", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id)
        )
        
    if owner_id:
        owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
        if bundle.get("owner_hash") != owner_hash:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.error(
                "Bundle not found", 
                code="not_found", 
                details={"key": "BUNDLE_NOT_FOUND", "details": {"bundle_id": bundle_id}, "config_path": ""},
                meta=governor.get_meta(decision.audit_id, "bundle_report", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id)
            )
        
    target_files = bundle["target_files"]
    
    # Policy-driven risk logic
    risk_level = "low"
    
    from fnmatch import fnmatch
    high_globs = governor.config.risk_rules.get("high_globs", [])
    medium_globs = governor.config.risk_rules.get("medium_globs", [])
    
    for f in target_files:
        if any(fnmatch(f, pat) for pat in high_globs):
            risk_level = "high"
            break
        elif any(fnmatch(f, pat) for pat in medium_globs):
            risk_level = "medium"
        
    test_recs = ["Run unit tests for affected modules."]
    if risk_level in ("medium", "high"):
        test_recs.append("Run full test suite and static analysis.")
        
    rollback_notes = [f"git checkout -- {' '.join(target_files)}"]
    
    commit_msg = f"Update {len(target_files)} files: " + ", ".join(target_files[:2])
    if len(target_files) > 2:
        commit_msg += " and others"
        
    data = {
        "bundle_id": bundle_id,
        "changed_files": target_files,
        "risk_level": risk_level,
        "test_recommendations": test_recs,
        "suggested_commit_message": commit_msg,
        "rollback_notes": rollback_notes
    }
    
    duration = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration})
    return ToolResponse.success(
        summary=f"Report for bundle {bundle_id}",
        data=data,
        meta=governor.get_meta(decision.audit_id, "bundle_report", "read", duration, run_id=run_id, owner_id=owner_id)
    )
