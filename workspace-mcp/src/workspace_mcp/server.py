from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from mcp.server.fastmcp import FastMCP

from .config import load_runtime_config
from .policy_loader import load_effective_policy
from .governor import Governor
from .mcp_logging import logger

from .tools.workspace_info import workspace_info as _workspace_info
from .tools.repo_search import repo_search as _repo_search
from .tools.read_file import read_file as _read_file
from .tools.apply_patch import apply_patch as _apply_patch, validate_patch as _validate_patch
from .tools.run_task import run_task as _run_task
from .tools.run_lifecycle import start_run as _start_run, end_run as _end_run, get_run_summary as _get_run_summary
from .tools.change_bundle import create_change_bundle as _create_change_bundle, bundle_report as _bundle_report
from .tools.explain_policy import explain_policy_decision as _explain_policy_decision
from .tools.kernel_version import kernel_version as _kernel_version
from .tools.self_check import self_check as _self_check


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="workspace-mcp")
    parser.add_argument("--workspace-root", default=None)
    parser.add_argument("--policy-path", default=None)
    parser.add_argument("--profile", choices=["dev", "ci", "read_only"], default=None)
    parser.add_argument("--strict", action="store_true", default=None)
    parser.add_argument("--config", default=None, help="Path to workspace-mcp.yaml")
    return parser


def _bind_tools(mcp: FastMCP, governor: Governor) -> None:
    @mcp.tool()
    def workspace_info(run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _workspace_info(governor, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def repo_search(
        query: str,
        file_globs: str | None = None,
        limit: int = 20,
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> dict[str, Any]:
        globs_list = [g.strip() for g in file_globs.split(",")] if file_globs else None
        return _repo_search(governor, query, globs_list, limit, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def read_file(
        path: str,
        start_line: int | None = None,
        end_line: int | None = None,
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return _read_file(governor, path, start_line, end_line, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def validate_patch(
        target_file: str,
        diff_text: str,
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return _validate_patch(governor, target_file, diff_text, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def apply_patch(diff_text: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _apply_patch(governor, diff_text, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def run_task(task_name: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _run_task(governor, task_name, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def start_run(metadata: Optional[Dict[str, Any]] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _start_run(governor, metadata, owner_id=owner_id).model_dump()

    @mcp.tool()
    def end_run(run_id: str, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _end_run(governor, run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def get_run_summary(run_id: str, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _get_run_summary(governor, run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def create_change_bundle(
        diff_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return _create_change_bundle(governor, diff_text, metadata, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def bundle_report(bundle_id: str, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _bundle_report(governor, bundle_id, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def explain_policy_decision(audit_id: str, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _explain_policy_decision(governor, audit_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def kernel_version(run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _kernel_version(governor, run_id=run_id, owner_id=owner_id).model_dump()

    @mcp.tool()
    def self_check(run_id: Optional[str] = None, owner_id: Optional[str] = None) -> dict[str, Any]:
        return _self_check(governor, run_id=run_id, owner_id=owner_id).model_dump()


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv if argv is not None else sys.argv[1:])

    cfg = load_runtime_config(
        cli={
            "workspace_root": args.workspace_root,
            "policy_path": args.policy_path,
            "profile": args.profile,
            "strict": args.strict,
        },
        config_file=Path(args.config).expanduser() if args.config else None,
    )

    effective_policy = load_effective_policy(
        profile=cfg.profile,
        project_policy_path=cfg.policy_path,
        strict=cfg.strict,
    )

    governor = Governor(effective_policy.data, workspace_root=cfg.workspace_root, strict=cfg.strict)

    mcp = FastMCP("workspace-mcp")
    _bind_tools(mcp, governor)

    logger.info(f"Server initialized for root: {governor.root}")
    mcp.run(transport="stdio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
