import pytest
import time
from workspace_mcp.governor import Governor
from workspace_mcp.config import PolicyConfig
from workspace_mcp.tools.run_lifecycle import start_run, end_run, get_run_summary
from workspace_mcp.tools.run_task import run_task

@pytest.fixture
def governor_instance(tmp_path):
    root = tmp_path / "project"
    root.mkdir()
    cfg = PolicyConfig(
        workspace_root=str(root),
        allow_paths=["."],
        deny_globs=["*.env"],
        allow_tasks={"echo": ["echo", "ok"]},
        max_file_bytes=64,
        max_runtime_seconds=2,
        max_output_bytes=1000,
        max_runs=10,
        run_ttl_seconds=1
    )
    return Governor(cfg)

def test_start_run_requires_owner_id(governor_instance):
    res = start_run(governor_instance, metadata={})
    assert res.status == "blocked"
    assert res.data["policy_violation"]["key"] == "OWNER_ID_REQUIRED"

def test_run_owner_mismatch_not_found_no_leak(governor_instance):
    res = start_run(governor_instance, metadata={}, owner_id="owner1")
    run_id = res.data["run_id"]
    
    summary_res = get_run_summary(governor_instance, run_id, owner_id="owner2")
    assert summary_res.status == "error"
    assert summary_res.code == "not_found"
    assert summary_res.data["key"] == "RUN_NOT_FOUND"

def test_end_run_twice_returns_run_already_ended(governor_instance):
    res = start_run(governor_instance, metadata={}, owner_id="owner1")
    run_id = res.data["run_id"]
    
    end_res1 = end_run(governor_instance, run_id, owner_id="owner1")
    assert end_res1.status == "ok"
    
    end_res2 = end_run(governor_instance, run_id, owner_id="owner1")
    assert end_res2.status == "error"
    assert end_res2.code == "invalid_input"
    assert end_res2.data["key"] == "RUN_ALREADY_ENDED"

def test_run_opt_in_tracking_does_not_mutate_without_run_id(governor_instance):
    run_task(governor_instance, "echo")
    
    assert len(governor_instance.runs) == 0

def test_run_tracking_updates_stats_with_run_id_and_owner(governor_instance):
    res = start_run(governor_instance, metadata={}, owner_id="owner1")
    run_id = res.data["run_id"]
    
    run_task(governor_instance, "echo", run_id=run_id, owner_id="owner1")
    
    summary_res = get_run_summary(governor_instance, run_id, owner_id="owner1")
    assert summary_res.status == "ok"
    
    data = summary_res.data
    assert data["allowed_count"] == 1
    assert data["blocked_count"] == 0
    assert "run_task" in data["tool_sequence"]
    assert data["risk_distribution"].get("execute") == 1

def test_run_ttl_eviction_returns_not_found(governor_instance, monkeypatch):
    current_time = 1000.0
    monkeypatch.setattr(time, "time", lambda: current_time)
    
    res = start_run(governor_instance, metadata={}, owner_id="owner1")
    run_id = res.data["run_id"]
    
    monkeypatch.setattr(time, "time", lambda: current_time + 5.0)
    
    summary_res = get_run_summary(governor_instance, run_id, owner_id="owner1")
    assert summary_res.status == "error"
    assert summary_res.code == "not_found"
    assert summary_res.data["key"] == "RUN_NOT_FOUND"