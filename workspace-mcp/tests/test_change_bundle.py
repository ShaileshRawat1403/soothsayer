import pytest
import time
from workspace_mcp.governor import Governor
from workspace_mcp.config import PolicyConfig
from workspace_mcp.tools.change_bundle import create_change_bundle, bundle_report

@pytest.fixture
def governor_instance(tmp_path):
    root = tmp_path / "project"
    root.mkdir()
    
    # Create target files
    (root / "a.txt").touch()
    src_dir = root / "src"
    src_dir.mkdir()
    (src_dir / "x.py").touch()
    
    cfg = PolicyConfig(
        workspace_root=str(root),
        allow_paths=["."],
        deny_globs=["*.env"],
        allow_tasks={"echo": ["echo", "ok"]},
        max_file_bytes=64,
        max_runtime_seconds=2,
        max_output_bytes=1000,
        max_bundles=10,
        bundle_ttl_seconds=1,
        risk_rules={"high_globs": ["*config*"], "medium_globs": ["*.py"]}
    )
    return Governor(cfg)

def test_bundle_id_determinism_same_input_same_id(governor_instance):
    diff = """--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+hello
--- a/src/x.py
+++ b/src/x.py
@@ -0,0 +1 @@
+print('world')
"""
    
    res1 = create_change_bundle(governor_instance, diff)
    bundle_id1 = res1.data["bundle_id"]
    
    res2 = create_change_bundle(governor_instance, diff)
    bundle_id2 = res2.data["bundle_id"]
    
    assert bundle_id1 == bundle_id2

def test_bundle_idempotency_no_duplicates(governor_instance):
    diff = """--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+hello
"""
    
    create_change_bundle(governor_instance, diff)
    size_before = len(governor_instance.bundles)
    
    res2 = create_change_bundle(governor_instance, diff)
    size_after = len(governor_instance.bundles)
    
    assert size_before == size_after
    assert res2.status == "ok"
    assert "Returned existing" in res2.summary

def test_bundle_owner_mismatch_not_found_no_leak(governor_instance):
    diff = """--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+hello
"""
    
    res = create_change_bundle(governor_instance, diff, owner_id="owner1")
    bundle_id = res.data["bundle_id"]
    
    report_res = bundle_report(governor_instance, bundle_id, owner_id="owner2")
    assert report_res.status == "error"
    assert report_res.code == "not_found"
    assert report_res.data["key"] == "BUNDLE_NOT_FOUND"

def test_bundle_ttl_eviction_returns_not_found(governor_instance, monkeypatch):
    current_time = 1000.0
    monkeypatch.setattr(time, "time", lambda: current_time)
    
    diff = """--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+hello
"""
    
    res = create_change_bundle(governor_instance, diff, owner_id="owner1")
    bundle_id = res.data["bundle_id"]
    
    monkeypatch.setattr(time, "time", lambda: current_time + 5.0)
    
    report_res = bundle_report(governor_instance, bundle_id, owner_id="owner1")
    assert report_res.status == "error"
    assert report_res.code == "not_found"
    assert report_res.data["key"] == "BUNDLE_NOT_FOUND"

def test_bundle_risk_is_policy_driven(governor_instance):
    diff = """--- a/src/x.py
+++ b/src/x.py
@@ -0,0 +1 @@
+print('world')
"""
    
    res = create_change_bundle(governor_instance, diff, owner_id="owner1")
    bundle_id = res.data["bundle_id"]
    
    report_res = bundle_report(governor_instance, bundle_id, owner_id="owner1")
    assert report_res.status == "ok"
    assert report_res.data["risk_level"] == "medium"