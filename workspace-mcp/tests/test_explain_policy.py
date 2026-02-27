import pytest
from workspace_mcp.governor import Governor
from workspace_mcp.config import PolicyConfig
from workspace_mcp.tools.explain_policy import explain_policy_decision
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
        max_audit_logs=10,
        audit_ttl_seconds=3600
    )
    return Governor(cfg)

def test_explain_missing_audit_returns_not_found(governor_instance):
    res = explain_policy_decision(governor_instance, "random-audit-id")
    assert res.status == "error"
    assert res.code == "not_found"

def test_explain_does_not_append_to_audit_logs(governor_instance):
    # Seed one log
    run_task(governor_instance, "echo")
    
    assert len(governor_instance.audit_logs) == 1
    audit_id = list(governor_instance.audit_logs.keys())[0]
    
    # Call explain
    explain_policy_decision(governor_instance, audit_id)
    
    # Assert size is still 1
    assert len(governor_instance.audit_logs) == 1

def test_explain_maps_violation_key_to_config_path(governor_instance):
    # Cause a violation (unlisted task)
    res = run_task(governor_instance, "rm")
    
    assert res.status == "blocked"
    audit_id = res.meta["audit_id"]
    
    # Explain it
    explain_res = explain_policy_decision(governor_instance, audit_id)
    assert explain_res.status == "ok"
    
    data = explain_res.data
    assert data["rule_triggered"] == "TASK_NOT_ALLOWLISTED"
    assert data["config_location"] == "profiles.dev.allow_tasks"