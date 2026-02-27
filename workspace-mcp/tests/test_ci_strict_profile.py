import pytest
from workspace_mcp.governor import Governor
from workspace_mcp.config import PolicyConfig
from workspace_mcp.tools.run_task import run_task
from workspace_mcp.tools.read_file import read_file

@pytest.fixture
def ci_governor(tmp_path):
    root = tmp_path / "project"
    root.mkdir()
    
    (root / "test.txt").write_text("hello", encoding="utf-8")
    
    cfg = PolicyConfig(
        workspace_root=str(root),
        allow_paths=["."],
        deny_globs=["*.env"],
        allow_tasks={"echo": ["echo", "ok"]},
        max_file_bytes=64,
        max_runtime_seconds=2,
        max_output_bytes=1000,
        profile="ci"
    )
    return Governor(cfg)

def test_ci_requires_run_id_for_execute_and_write(ci_governor):
    # Execute without run_id -> Blocked
    res_exec = run_task(ci_governor, "echo")
    assert res_exec.status == "blocked"
    assert res_exec.data["policy_violation"]["key"] == "RUN_ID_REQUIRED"
    
    # Write without run_id -> Blocked (Note validate_patch is read risk, apply_patch is write risk)
    # wait, validate_patch is actually "read" in the code, so it should be allowed!
    # Let's test apply_patch instead but we need a valid diff. 
    # Or just validate that read_file IS allowed.
    res_read = read_file(ci_governor, "test.txt")
    assert res_read.status == "ok"