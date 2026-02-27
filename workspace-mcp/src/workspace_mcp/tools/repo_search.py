import fnmatch
import os
import time
import subprocess
from pathlib import Path
from typing import List, Optional

from ..governor import Governor
from ..response_schema import ToolResponse


def repo_search(
    governor: Governor,
    query: str,
    file_globs: Optional[List[str]] = None,
    limit: int = 20,
    run_id: Optional[str] = None,
    owner_id: Optional[str] = None
) -> ToolResponse:
    """
    Search for text in workspace files using ripgrep when available.
    """
    start_time = time.time()
    decision = governor.validate_action(
        "repo_search",
        "read",
        {"query": query, "file_globs": file_globs, "limit": limit},
        run_id=run_id,
        owner_id=owner_id
    )
    if not decision.allowed:
        if decision.block_response:
            duration_ms = int((time.time() - start_time) * 1000)
            decision.block_response.meta["duration_ms"] = duration_ms
            governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
            return decision.block_response
        return ToolResponse.error("Action blocked", code="blocked")

    if not query.strip():
        governor.update_audit(decision.audit_id, {"duration_ms": int((time.time() - start_time) * 1000)})
        return ToolResponse.blocked("Invalid query", {"key": "INVALID_QUERY", "details": {"reason": "query must be non-empty"}, "config_path": ""}, meta=governor.get_meta(decision.audit_id, "repo_search", "read", int((time.time() - start_time) * 1000), run_id=run_id, owner_id=owner_id))

    bounded_limit = max(1, min(limit, 200))
    rg_results = _search_with_rg(governor, query, file_globs, bounded_limit)
    if rg_results is not None:
        duration_ms = int((time.time() - start_time) * 1000)
        governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
        return ToolResponse.success(
            summary=f"Found {len(rg_results)} matches",
            data={"matches": rg_results, "engine": "ripgrep"},
            meta=governor.get_meta(decision.audit_id, "repo_search", "read", duration_ms, run_id=run_id, owner_id=owner_id)
        )

    py_results = _search_with_python(governor, query, file_globs, bounded_limit)
    duration_ms = int((time.time() - start_time) * 1000)
    governor.update_audit(decision.audit_id, {"duration_ms": duration_ms})
    return ToolResponse.success(
        summary=f"Found {len(py_results)} matches",
        data={"matches": py_results, "engine": "python"},
        meta=governor.get_meta(decision.audit_id, "repo_search", "read", duration_ms, run_id=run_id, owner_id=owner_id)
    )


def _search_with_rg(
    governor: Governor,
    query: str,
    file_globs: Optional[List[str]],
    limit: int,
) -> Optional[List[str]]:
    try:
        subprocess.run(["rg", "--version"], capture_output=True, check=True, text=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None

    cmd = [
        "rg",
        "--no-heading",
        "--line-number",
        "--max-count",
        str(limit),
        query,
        str(governor.root),
    ]
    for pattern in governor.config.deny_globs:
        cmd.extend(["-g", f"!{pattern}"])
    if file_globs:
        for pattern in file_globs:
            cmd.extend(["-g", pattern])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=governor.root,
            timeout=min(10, governor.config.max_runtime_seconds),
        )
    except subprocess.TimeoutExpired:
        return ["[search timed out]"]

    if proc.returncode not in (0, 1):
        return [f"[ripgrep error] {proc.stderr.strip()}"]

    results = [line for line in proc.stdout.splitlines() if line.strip()]
    return results[:limit]


def _search_with_python(
    governor: Governor,
    query: str,
    file_globs: Optional[List[str]],
    limit: int,
) -> List[str]:
    matches: List[str] = []
    globs = file_globs or ["*"]

    for dirpath, _, filenames in os.walk(governor.root):
        for file_name in filenames:
            if len(matches) >= limit:
                return matches
            rel_path = str(Path(dirpath, file_name).resolve().relative_to(governor.root)).replace("\\", "/")

            if any(fnmatch.fnmatch(rel_path, pattern) for pattern in governor.config.deny_globs):
                continue
            if not any(fnmatch.fnmatch(rel_path, pattern) for pattern in globs):
                continue

            full_path = Path(governor.root, rel_path)
            try:
                if full_path.stat().st_size > governor.config.max_file_bytes:
                    continue
                with full_path.open("r", encoding="utf-8", errors="replace") as handle:
                    for line_number, line in enumerate(handle, start=1):
                        if query in line:
                            matches.append(f"{rel_path}:{line_number}:{line.rstrip()}")
                            if len(matches) >= limit:
                                return matches
            except OSError:
                continue
    return matches
