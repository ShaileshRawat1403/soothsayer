import pytest
from workspace_mcp.governor import Governor
from workspace_mcp.config import PolicyConfig
from workspace_mcp.tools.read_file import read_file
from workspace_mcp.tools.run_task import run_task

@pytest.fixture
def governor_instance(tmp_path):
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
        max_output_bytes=1000
    )
    return Governor(cfg)

def test_every_response_has_full_meta_fields(governor_instance):
    # Read tool
    res_read = read_file(governor_instance, "test.txt")
    meta_read = res_read.meta
    
    assert "audit_id" in meta_read
    assert "policy_hash" in meta_read
    assert "timestamp" in meta_read
    assert meta_read["timestamp"].endswith("Z")
    assert "run_counter" in meta_read
    assert "server_instance_id" in meta_read
    assert meta_read["tool"] == "read_file"
    assert meta_read["risk"] == "read"
    
    # Execute tool
    res_exec = run_task(governor_instance, "echo")
    meta_exec = res_exec.meta
    
    assert "audit_id" in meta_exec
    assert "policy_hash" in meta_exec
    assert "timestamp" in meta_exec
    assert meta_exec["timestamp"].endswith("Z")
    assert "run_counter" in meta_exec
    assert "server_instance_id" in meta_exec
    assert meta_exec["tool"] == "run_task"
    assert meta_exec["risk"] == "execute"

def test_args_sha256_is_salted_and_changes_with_args(governor_instance):
    run_task(governor_instance, "echo")
    log1 = governor_instance.audit_logs.values()[-1]
    
    # Attempt blocked task
    run_task(governor_instance, "rm")
    log2 = governor_instance.audit_logs.values()[-1]
    
    assert log1["args_sha256"] != log2["args_sha256"]
    
    # Assert not raw args
    assert log1["args_sha256"] != '{"args": {"task_name": "echo"}}'
