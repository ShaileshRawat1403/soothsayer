from pathlib import Path

from workspace_mcp.config import PolicyConfig
from workspace_mcp.governor import Governor
from workspace_mcp.tools.repo_search import repo_search


def test_repo_search_python_fallback_returns_matches(tmp_path: Path) -> None:
    root = tmp_path / "project"
    root.mkdir()
    (root / "a.txt").write_text("hello world\nneedle here\n", encoding="utf-8")
    cfg = PolicyConfig(
        workspace_root=str(root),
        allow_paths=["."],
        deny_globs=["*.env"],
        allow_tasks={"echo": ["echo", "ok"]},
        max_file_bytes=1000,
        max_runtime_seconds=2,
        max_output_bytes=2000,
    )
    gov = Governor(cfg)

    resp = repo_search(gov, "needle", limit=10)
    assert resp.status == "ok"
    assert any("needle here" in line for line in resp.data["matches"])
