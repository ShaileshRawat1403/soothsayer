import subprocess
import tempfile
import re
import time
from typing import Optional
from ..governor import Governor
from ..response_schema import ToolResponse
from ..path_safety import resolve_path, validate_path, PathSafetyError

def validate_patch(governor: Governor, target_file: str, diff_text: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    start_time = time.time()
    decision = governor.validate_action("validate_patch", "read", {"path": target_file, "diff_size": len(diff_text)}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")
        
    try:
        safe_path = resolve_path(governor.root, target_file)
        validate_path(safe_path, governor.root, governor.config.deny_globs, governor.config.allow_paths)
        
        if not safe_path.exists():
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.error("Target file not found", code="not_found", meta=governor.get_meta(decision.audit_id, "validate_patch", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
            
        if "---" not in diff_text or "+++" not in diff_text:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.error("Invalid diff format", code="invalid_input", meta=governor.get_meta(decision.audit_id, "validate_patch", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
        duration_ms = int((time.time() - start_time) * 1000)
        governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
        return ToolResponse.success(
            summary="Patch validation passed",
            data={"target_file": target_file, "violations": []},
            meta=governor.get_meta(decision.audit_id, "validate_patch", "read", duration_ms, run_id=run_id, owner_id=owner_id)
        )
    except PathSafetyError as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Patch targets unsafe file", {"key": "PATH_OUTSIDE_ALLOW_PATHS", "details": {"error": str(e)}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "validate_patch", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

def apply_patch(governor: Governor, diff_text: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    """
    Applies a unified diff to the workspace.
    """
    start_time = time.time()
    # Parse targets from unified diff headers.
    target_files = set()
    path_regex = re.compile(r'^(?:\+\+\+|---) (?:[ab]/)?(.+)$', re.MULTILINE)

    matches = path_regex.findall(diff_text)
    parsed_targets = [target.strip() for target in matches if target != "/dev/null"]
    # Governor Check (includes allow/deny write path checks)
    decision = governor.validate_action("apply_patch", "write", {"diff_size": len(diff_text), "paths": parsed_targets}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    if not matches:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error("Could not parse any target paths from diff", code="invalid_input", meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

    try:
        for target in matches:
            if target == "/dev/null":
                continue

            clean_target = target.strip()

            safe_path = resolve_path(governor.root, clean_target)
            validate_path(safe_path, governor.root, governor.config.deny_globs, governor.config.allow_paths)
            target_files.add(str(safe_path.relative_to(governor.root)))

    except PathSafetyError as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Patch targets unsafe file", {"key": "PATH_OUTSIDE_ALLOW_PATHS", "details": {"error": str(e)}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

    # Apply patch with dry-run first.
    try:
        with tempfile.NamedTemporaryFile(mode='w+', encoding='utf-8', delete=True) as tmp:
            tmp.write(diff_text)
            tmp.flush()

            def run_patch(strip_level: str, dry_run: bool) -> subprocess.CompletedProcess[str]:
                cmd = ["patch", strip_level, "--input", tmp.name]
                if dry_run:
                    cmd.insert(1, "--dry-run")
                return subprocess.run(
                    cmd,
                    cwd=governor.root,
                    capture_output=True,
                    text=True,
                    timeout=governor.config.max_runtime_seconds,
                )

            dry_proc = run_patch("-p1", dry_run=True)
            if dry_proc.returncode != 0:
                dry_proc = run_patch("-p0", dry_run=True)
            if dry_proc.returncode != 0:
                governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
                return ToolResponse.error(
                    "Patch simulation failed",
                    code="tool_failed",
                    details={"stderr": dry_proc.stderr, "stdout": dry_proc.stdout},
                    meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id)
                )

            proc = run_patch("-p1", dry_run=False)
            if proc.returncode != 0:
                proc = run_patch("-p0", dry_run=False)
            if proc.returncode != 0:
                governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
                return ToolResponse.error("Patch failed to apply", code="tool_failed", details={"stderr": proc.stderr, "stdout": proc.stdout}, meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

            duration_ms = int((time.time() - start_time) * 1000)
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return ToolResponse.success(
                summary="Patch applied successfully",
                data={
                    "modified_files": list(target_files),
                    "output": proc.stdout
                },
                meta=governor.get_meta(decision.audit_id, "apply_patch", "write", duration_ms, run_id=run_id, owner_id=owner_id)
            )

    except subprocess.TimeoutExpired:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error("Patch execution timed out", code="timeout", meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
    except Exception as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(f"Patch execution error: {str(e)}", code="tool_failed", meta=governor.get_meta(decision.audit_id, "apply_patch", "write", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
