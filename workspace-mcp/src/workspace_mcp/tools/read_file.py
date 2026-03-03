import time
from typing import Optional
from ..governor import Governor
from ..response_schema import ToolResponse
from ..path_safety import resolve_path, validate_path, PathSafetyError

def read_file(
    governor: Governor,
    path: str,
    start_line: Optional[int] = None,
    end_line: Optional[int] = None,
    run_id: Optional[str] = None,
    owner_id: Optional[str] = None
) -> ToolResponse:
    """
    Reads a file from the workspace safely.
    """
    start_time = time.time()
    # Governor Check
    decision = governor.validate_action("read_file", "read", {
        "path": path, "start_line": start_line, "end_line": end_line
    }, run_id=run_id, owner_id=owner_id)
    
    if not decision.allowed:
        if decision.block_response:
            decision.block_response.meta["duration_ms"] = int((time.time() - start_time) * 1000)
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    try:
        # Path Safety
        safe_path = resolve_path(governor.root, path)
        validate_path(safe_path, governor.root, governor.config.deny_globs, governor.config.allow_paths)

        # Size Check
        stats = safe_path.stat()
        if stats.st_size > governor.config.max_file_bytes:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.blocked(
                reason="File too large",
                policy_violation={"key": "FILE_EXCEEDS_MAX_BYTES", "details": {"size": stats.st_size, "max_size": governor.config.max_file_bytes}, "config_path": "max_file_bytes"},
                meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id)
            )

        # Read
        with open(safe_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        total_lines = len(lines)

        if start_line is not None and start_line < 1:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.blocked("Invalid line range", {"key": "INVALID_LINE_RANGE", "details": {"start_line": start_line}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
        if end_line is not None and end_line < 1:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.blocked("Invalid line range", {"key": "INVALID_LINE_RANGE", "details": {"end_line": end_line}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
        if start_line is not None and end_line is not None and end_line < start_line:
            governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
            return ToolResponse.blocked("Invalid line range", {"key": "INVALID_LINE_RANGE", "details": {"start_line": start_line, "end_line": end_line}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

        start = (start_line - 1) if start_line and start_line > 0 else 0
        end = end_line if end_line and end_line <= total_lines else total_lines

        content = "".join(lines[start:end])

        duration_ms = int((time.time() - start_time) * 1000)
        governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
        return ToolResponse.success(
            summary=f"Read {len(content)} bytes from {safe_path.name}",
            data={
                "path": str(safe_path.relative_to(governor.root)),
                "content": content,
                "total_lines": total_lines,
                "lines_read": f"{start+1}-{end}"
            },
            meta=governor.get_meta(decision.audit_id, "read_file", "read", duration_ms, run_id=run_id, owner_id=owner_id)
        )

    except PathSafetyError as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Path safety violation", {"key": "PATH_SAFETY_ERROR", "details": {"error": str(e)}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
    except FileNotFoundError:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(f"File not found: {path}", code="not_found", meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
    except Exception as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(f"Read error: {str(e)}", code="tool_failed", meta=governor.get_meta(decision.audit_id, "read_file", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
