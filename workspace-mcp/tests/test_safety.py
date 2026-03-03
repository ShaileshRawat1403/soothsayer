from pathlib import Path

from workspace_mcp.config import PolicyConfig
from workspace_mcp.governor import Governor
from workspace_mcp.tools.read_file import read_file
from workspace_mcp.tools.run_task import run_task
from workspace_mcp.tools.apply_patch import apply_patch


def _governor(tmp_path: Path) -> Governor:
    root = tmp_path / "project"
    root.mkdir()
    cfg = PolicyConfig(
        workspace_root=str(root),
        allow_paths=["."],
        deny_globs=["*.env", "**/.git/**"],
        allow_tasks={"echo": ["echo", "ok"]},
        max_file_bytes=64,
        max_runtime_seconds=2,
        max_output_bytes=1000,
    )
    return Governor(cfg)


def test_path_traversal_blocked(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    outside = tmp_path / "outside.txt"
    outside.write_text("x", encoding="utf-8")
    resp = read_file(gov, "../outside.txt")
    assert resp.status == "blocked"


def test_denied_glob_blocked(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    secret = Path(gov.root, "secrets.env")
    secret.write_text("SECRET=1", encoding="utf-8")
    resp = read_file(gov, "secrets.env")
    assert resp.status == "blocked"


def test_oversized_file_blocked(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    big = Path(gov.root, "big.txt")
    big.write_text("x" * 1000, encoding="utf-8")
    resp = read_file(gov, "big.txt")
    assert resp.status == "blocked"
    violation = resp.data.get("policy_violation", {})
    assert isinstance(violation, dict)
    assert violation.get("key") == "FILE_EXCEEDS_MAX_BYTES"


def test_blocked_task(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    resp = run_task(gov, "rm")
    assert resp.status == "blocked"


def test_apply_patch_denied_target_blocked(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    patch = """--- a/.env
+++ b/.env
@@ -0,0 +1 @@
+SECRET=1
"""
    resp = apply_patch(gov, patch)
    assert resp.status in {"blocked", "error"}
