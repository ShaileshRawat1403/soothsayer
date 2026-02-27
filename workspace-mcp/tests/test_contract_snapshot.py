from pathlib import Path

from workspace_mcp.config import PolicyConfig
from workspace_mcp.governor import Governor
from workspace_mcp.response_schema import CANONICAL_META_KEYS
from workspace_mcp.tools.kernel_version import kernel_version
from workspace_mcp.tools.read_file import read_file
from workspace_mcp.tools.run_task import run_task
from workspace_mcp.tools.self_check import self_check


def _governor(tmp_path: Path) -> Governor:
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
    )
    return Governor(cfg)


def test_code_alignment_meta_matches_top_level_on_success(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    res = read_file(gov, "test.txt").model_dump()
    assert res["meta"]["code"] == res["code"]
    assert set(res["meta"].keys()) == CANONICAL_META_KEYS


def test_code_alignment_meta_matches_top_level_on_blocked(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    res = run_task(gov, "rm").model_dump()
    assert res["meta"]["code"] == res["code"]
    assert set(res["meta"].keys()) == CANONICAL_META_KEYS


def test_kernel_version_shape(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    res = kernel_version(gov).model_dump()
    assert set(res["data"].keys()) == {
        "kernel_version",
        "contract_version",
        "policy_schema_version",
        "policy_profile",
        "policy_hash",
        "server_instance_id",
    }
    assert set(res["meta"].keys()) == CANONICAL_META_KEYS
    assert res["meta"]["code"] == res["code"]


def test_self_check_shape(tmp_path: Path) -> None:
    gov = _governor(tmp_path)
    res = self_check(gov).model_dump()
    assert set(res["data"].keys()) == {"status", "kernel_version", "checks"}
    assert res["data"]["status"] in ("ok", "error")
    names = {check["name"] for check in res["data"]["checks"]}
    assert names == {"policy_loaded", "bounded_stores", "meta_contract"}
    assert set(res["meta"].keys()) == CANONICAL_META_KEYS
    assert res["meta"]["code"] == res["code"]
