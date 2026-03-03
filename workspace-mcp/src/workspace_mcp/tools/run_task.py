import subprocess
import time
from typing import Optional
from ..governor import Governor
from ..response_schema import ToolResponse

def run_task(governor: Governor, task_name: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> ToolResponse:
    """
    Executes a pre-defined task from the policy.
    """
    start_time = time.time()
    
    # 1. Governor Validation (Creates Audit Log internally)
    decision = governor.validate_action("run_task", "execute", {"task_name": task_name}, run_id=run_id, owner_id=owner_id)
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    command = governor.config.allow_tasks.get(task_name)
    if not command:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Task not found", {"key": "TASK_NOT_ALLOWLISTED", "details": {"task_name": task_name, "allowed": list(governor.config.allow_tasks.keys())}, "config_path": f"profiles.{governor.config.profile}.allow_tasks"}, meta=governor.get_meta(decision.audit_id, "run_task", "execute", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

    try:
        # 2. Secure Tool Execution
        proc = subprocess.run(
            command,
            cwd=governor.root,
            capture_output=True,
            text=True,
            shell=False,
            timeout=governor.config.max_runtime_seconds,
            env={"PATH": "/usr/bin:/bin:/usr/local/bin", "LANG": "C.UTF-8"},
        )

        duration = time.time() - start_time

        # 3. Output Truncation
        max_bytes = governor.config.max_output_bytes
        stdout_raw = proc.stdout.encode("utf-8", errors="replace")
        stderr_raw = proc.stderr.encode("utf-8", errors="replace")
        
        output_truncated = False
        
        stdout = stdout_raw[:max_bytes].decode("utf-8", errors="replace")
        stderr = stderr_raw[:max_bytes].decode("utf-8", errors="replace")

        if len(stdout_raw) > max_bytes:
            stdout += "\n... [TRUNCATED]"
            output_truncated = True
        if len(stderr_raw) > max_bytes:
            stderr += "\n... [TRUNCATED]"
            output_truncated = True

        data = {
            "exit_code": proc.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "duration_seconds": round(duration, 2)
        }
        
        # 4. Structured Output Parsing
        if task_name == "pytest":
            try:
                # Basic parsing for pytest
                summary_line = [line for line in stdout.splitlines() if "==" in line and ("passed" in line or "failed" in line)]
                if summary_line:
                    data["pytest_summary"] = summary_line[-1].strip()
            except Exception:
                pass
        elif task_name == "ruff":
            try:
                # Basic parsing for ruff
                violations = [line for line in stdout.splitlines() if ".py:" in line]
                data["ruff_violations_count"] = len(violations)
            except Exception:
                pass

        # 5. Safe Meta Creation
        duration_ms = int(duration * 1000)
        governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
        return ToolResponse.success(
            summary=f"Task '{task_name}' finished with code {proc.returncode}",
            data=data,
            meta=governor.get_meta(decision.audit_id, "run_task", "execute", duration_ms, output_truncated=output_truncated, run_id=run_id, owner_id=owner_id)
        )

    except subprocess.TimeoutExpired:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(
            f"Task '{task_name}' timed out after {governor.config.max_runtime_seconds}s",
            code="timeout",
            meta=governor.get_meta(decision.audit_id, "run_task", "execute", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id)
        )
    except Exception as e:
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.error(f"Execution failed: {str(e)}", code="tool_failed", meta=governor.get_meta(decision.audit_id, "run_task", "execute", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))
