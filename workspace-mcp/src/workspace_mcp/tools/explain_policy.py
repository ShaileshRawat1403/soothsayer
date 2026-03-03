import time
import hashlib
from typing import Optional
from ..governor import Governor
from ..response_schema import ToolResponse

def explain_policy_decision(governor: Governor, audit_id: str, owner_id: Optional[str] = None) -> ToolResponse:
    """
    Explains why a specific action was blocked or allowed based on the policy.
    """
    start_time = time.time()
    
    # We do a 'read' check for this tool as well, but skip audit log mutation
    decision_obj = governor.validate_action("explain_policy_decision", "read", {"audit_id": audit_id}, skip_audit=True)
    if not decision_obj.allowed:
        if decision_obj.block_response:
            decision_obj.block_response.meta["duration_ms"] = int((time.time() - start_time) * 1000)
            return decision_obj.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    # Search for the audit_id
    log_entry = governor.audit_logs.get(audit_id)
    
    if not log_entry:
        return ToolResponse.error("Audit log not found", code="not_found", meta=governor.get_meta(decision_obj.audit_id, "explain_policy_decision", "read", int((time.time() - start_time) * 1000)))

    # Match owner if provided
    if owner_id:
        owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
        if log_entry.get("owner_id_hash") != owner_hash:
            return ToolResponse.error("Audit log not found", code="not_found", meta=governor.get_meta(decision_obj.audit_id, "explain_policy_decision", "read", int((time.time() - start_time) * 1000)))

    decision = log_entry["decision"]
    violation = log_entry.get("violation")
    tool = log_entry["tool"]
    
    explanation = {
        "audit_id": audit_id,
        "tool": tool,
        "decision": decision,
    }

    if decision == "blocked" and violation:
        violation_key = violation.get("key", "UNKNOWN")
        explanation["rule_triggered"] = violation_key
        explanation["config_location"] = violation.get("config_path", "unknown")
        
        # Determine compliant alternative and evidence based on the structured key
        if violation_key == "PATH_OUTSIDE_ALLOW_PATHS":
            explanation["evidence"] = "The target path is not within the configured allow_paths."
            explanation["compliant_alternative"] = "Move the file to one of the allowed directories or update the allow_paths section."
        elif violation_key == "PATH_MATCHES_DENY_GLOBS":
            explanation["evidence"] = "The target path matches a restricted glob pattern."
            explanation["compliant_alternative"] = "Avoid modifying this file, or update the deny_globs section to exclude it."
        elif violation_key == "TASK_NOT_ALLOWLISTED":
            explanation["evidence"] = "The requested task is not defined in the allowed task list."
            explanation["compliant_alternative"] = "Use one of the allowed tasks or add the task to allow_tasks."
        elif violation_key == "FILE_EXCEEDS_MAX_BYTES":
            explanation["evidence"] = "The file exceeds the maximum allowed size for reading."
            explanation["compliant_alternative"] = "Read the file in chunks (if supported) or increase max_file_bytes."
        elif violation_key == "OWNER_ID_REQUIRED":
            explanation["evidence"] = "The action requires an owner_id to access or mutate state."
            explanation["compliant_alternative"] = "Provide a valid owner_id."
        elif violation_key == "RUN_ID_REQUIRED":
            explanation["evidence"] = "The current profile requires an explicit run_id for stateful actions."
            explanation["compliant_alternative"] = "Start a run and provide the run_id."
        elif violation_key == "RUN_NOT_FOUND":
            explanation["evidence"] = "The specified run was not found or ownership mismatched."
            explanation["compliant_alternative"] = "Ensure the run_id is correct and belongs to the provided owner_id."
        elif violation_key == "BUNDLE_NOT_FOUND":
            explanation["evidence"] = "The specified bundle was not found or ownership mismatched."
            explanation["compliant_alternative"] = "Ensure the bundle_id is correct and belongs to the provided owner_id."
        else:
            explanation["evidence"] = "The action violated the workspace security policy."
            explanation["compliant_alternative"] = "Review the policy configuration to ensure this action is permitted."
    else:
        explanation["rule_triggered"] = "None"
        explanation["evidence"] = "The action passed all policy checks."
        explanation["compliant_alternative"] = "N/A"
        explanation["config_location"] = "N/A"

    duration = int((time.time() - start_time) * 1000)
    return ToolResponse.success(
        summary=f"Explained policy decision for {audit_id}",
        data=explanation,
        meta=governor.get_meta(decision_obj.audit_id, "explain_policy_decision", "read", duration, owner_id=owner_id)
    )