"""Capability Registry for Workspace MCP.

This module provides a centralized capability manifest that maps:
- Tool IDs to their metadata (risk level, category, approval posture)
- Workflow classes to their expected capability bundles
- Artifact/output expectations

This enables:
1. One canonical place for capability metadata
2. Deterministic workflow-to-capability mapping
3. Clear allowlist behavior
4. Consistent Soothsayer/Picobot-facing behavior
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ToolCategory(Enum):
    """Tool categories for organization and filtering."""
    READ = "read"
    WRITE = "write"
    SEARCH = "search"
    LIFECYCLE = "lifecycle"
    POLICY = "policy"
    ANALYSIS = "analysis"


class ApprovalPosture(Enum):
    """Approval requirement for tools."""
    AUTO = "auto"           # No approval needed
    ASK = "ask"             # Requires approval
    BLOCKED = "blocked"     # Not allowed in current context


class RiskLevel(Enum):
    """Risk levels matching DAX taxonomy."""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    NETWORK = "network"


@dataclass
class ToolCapability:
    """Metadata for a single MCP tool capability."""
    tool_id: str                           # Unique identifier (matches MCP tool name)
    display_name: str                      # Human-readable name
    description: str                       # What the tool does
    category: ToolCategory                 # Organizational category
    risk_level: RiskLevel                  # Risk classification
    approval_posture: ApprovalPosture      # Approval requirement
    requires_owner: bool = True            # Requires run_id/owner_id context
    supported_workflows: list[str] = field(default_factory=list)  # Compatible workflows
    expected_artifacts: list[str] = field(default_factory=list)   # Outputs produced
    notes: Optional[str] = None             # Additional context


# Canonical tool registry
# This is the single source of truth for Workspace MCP tool metadata
TOOL_REGISTRY: dict[str, ToolCapability] = {
    # === READ TOOLS ===
    "workspace_info": ToolCapability(
        tool_id="workspace_info",
        display_name="Workspace Info",
        description="Get information about the current workspace, including root, active runs, and status",
        category=ToolCategory.READ,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=False,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["workspace_metadata"],
    ),
    
    "repo_search": ToolCapability(
        tool_id="repo_search",
        display_name="Repository Search",
        description="Search the codebase using semantic or keyword queries",
        category=ToolCategory.SEARCH,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "review_and_signoff"],
        expected_artifacts=["search_results"],
    ),
    
    "read_file": ToolCapability(
        tool_id="read_file",
        display_name="Read File",
        description="Read file contents with optional line range filtering",
        category=ToolCategory.READ,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["file_content"],
    ),
    
    # === WRITE TOOLS ===
    "validate_patch": ToolCapability(
        tool_id="validate_patch",
        display_name="Validate Patch",
        description="Validate a diff/patch without applying it",
        category=ToolCategory.WRITE,
        risk_level=RiskLevel.WRITE,
        approval_posture=ApprovalPosture.ASK,
        requires_owner=True,
        supported_workflows=["draft_and_approve"],
        expected_artifacts=["validation_result"],
    ),
    
    "apply_patch": ToolCapability(
        tool_id="apply_patch",
        display_name="Apply Patch",
        description="Apply a diff/patch to modify files in the workspace",
        category=ToolCategory.WRITE,
        risk_level=RiskLevel.WRITE,
        approval_posture=ApprovalPosture.ASK,
        requires_owner=True,
        supported_workflows=["draft_and_approve"],
        expected_artifacts=["patch_result", "modified_files"],
    ),
    
    "create_change_bundle": ToolCapability(
        tool_id="create_change_bundle",
        display_name="Create Change Bundle",
        description="Create a structured change bundle for review and approval",
        category=ToolCategory.WRITE,
        risk_level=RiskLevel.WRITE,
        approval_posture=ApprovalPosture.ASK,
        requires_owner=True,
        supported_workflows=["draft_and_approve"],
        expected_artifacts=["bundle_id", "bundle_summary"],
    ),
    
    "bundle_report": ToolCapability(
        tool_id="bundle_report",
        display_name="Bundle Report",
        description="Get detailed report for a change bundle",
        category=ToolCategory.READ,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["draft_and_approve", "review_and_signoff"],
        expected_artifacts=["bundle_details"],
    ),
    
    # === LIFECYCLE TOOLS ===
    "start_run": ToolCapability(
        tool_id="start_run",
        display_name="Start Run",
        description="Start a new governance-controlled run session",
        category=ToolCategory.LIFECYCLE,
        risk_level=RiskLevel.EXECUTE,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["run_id"],
    ),
    
    "end_run": ToolCapability(
        tool_id="end_run",
        display_name="End Run",
        description="End the current run session and finalize artifacts",
        category=ToolCategory.LIFECYCLE,
        risk_level=RiskLevel.EXECUTE,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["run_summary"],
    ),
    
    "get_run_summary": ToolCapability(
        tool_id="get_run_summary",
        display_name="Get Run Summary",
        description="Get the summary and final state of a run",
        category=ToolCategory.LIFECYCLE,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["run_metadata", "artifacts", "audit_log"],
    ),
    
    "run_task": ToolCapability(
        tool_id="run_task",
        display_name="Run Task",
        description="Execute a predefined task within the workspace",
        category=ToolCategory.WRITE,
        risk_level=RiskLevel.EXECUTE,
        approval_posture=ApprovalPosture.ASK,
        requires_owner=True,
        supported_workflows=["generic"],
        expected_artifacts=["task_result"],
    ),
    
    # === POLICY TOOLS ===
    "explain_policy_decision": ToolCapability(
        tool_id="explain_policy_decision",
        display_name="Explain Policy Decision",
        description="Get explanation for a policy decision (allow/block) by audit ID",
        category=ToolCategory.POLICY,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=True,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["policy_explanation"],
    ),
    
    "self_check": ToolCapability(
        tool_id="self_check",
        display_name="Self Check",
        description="Run workspace safety and policy self-checks",
        category=ToolCategory.POLICY,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=False,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["check_results"],
    ),
    
    "kernel_version": ToolCapability(
        tool_id="kernel_version",
        display_name="Kernel Version",
        description="Get the Workspace MCP kernel version and capabilities",
        category=ToolCategory.POLICY,
        risk_level=RiskLevel.READ,
        approval_posture=ApprovalPosture.AUTO,
        requires_owner=False,
        supported_workflows=["generic", "repo_analyze", "draft_and_approve", "review_and_signoff"],
        expected_artifacts=["version_info"],
    ),
}


# Workflow-to-capability bundle mapping
# Defines which tools are expected/allowed for each workflow class
WORKFLOW_CAPABILITY_BUNDLES: dict[str, list[str]] = {
    "repo_analyze": [
        "workspace_info",
        "repo_search",
        "read_file",
        "start_run",
        "end_run",
        "get_run_summary",
        "explain_policy_decision",
        "self_check",
        "kernel_version",
    ],
    "draft_and_approve": [
        "workspace_info",
        "read_file",
        "validate_patch",
        "apply_patch",
        "create_change_bundle",
        "bundle_report",
        "start_run",
        "end_run",
        "get_run_summary",
        "run_task",
        "explain_policy_decision",
        "self_check",
        "kernel_version",
    ],
    "review_and_signoff": [
        "workspace_info",
        "repo_search",
        "read_file",
        "bundle_report",
        "start_run",
        "end_run",
        "get_run_summary",
        "explain_policy_decision",
        "self_check",
        "kernel_version",
    ],
    "generic": [
        "workspace_info",
        "repo_search",
        "read_file",
        "validate_patch",
        "apply_patch",
        "create_change_bundle",
        "bundle_report",
        "start_run",
        "end_run",
        "get_run_summary",
        "run_task",
        "explain_policy_decision",
        "self_check",
        "kernel_version",
    ],
}


# Artifact type registry
# Standard artifact types produced by Workspace MCP tools
ARTIFACT_TYPES = {
    "workspace_metadata": {
        "description": "Workspace root, paths, and status information",
        "mime_type": "application/json",
    },
    "search_results": {
        "description": "Code search results with relevance scoring",
        "mime_type": "application/json",
    },
    "file_content": {
        "description": "File or file range contents",
        "mime_type": "text/plain",
    },
    "validation_result": {
        "description": "Patch/diff validation result",
        "mime_type": "application/json",
    },
    "patch_result": {
        "description": "Patch application result",
        "mime_type": "application/json",
    },
    "modified_files": {
        "description": "List of files modified by patch",
        "mime_type": "application/json",
    },
    "bundle_id": {
        "description": "Unique identifier for a change bundle",
        "mime_type": "text/plain",
    },
    "bundle_summary": {
        "description": "Summary of changes in a bundle",
        "mime_type": "application/json",
    },
    "bundle_details": {
        "description": "Detailed bundle report",
        "mime_type": "application/json",
    },
    "run_id": {
        "description": "Unique run identifier",
        "mime_type": "text/plain",
    },
    "run_summary": {
        "description": "Final run summary with artifacts and audit log",
        "mime_type": "application/json",
    },
    "run_metadata": {
        "description": "Run metadata including timestamps and status",
        "mime_type": "application/json",
    },
    "artifacts": {
        "description": "List of artifacts produced by the run",
        "mime_type": "application/json",
    },
    "audit_log": {
        "description": "Complete audit log for the run",
        "mime_type": "application/json",
    },
    "task_result": {
        "description": "Result of running a predefined task",
        "mime_type": "application/json",
    },
    "policy_explanation": {
        "description": "Explanation of a policy decision",
        "mime_type": "text/plain",
    },
    "check_results": {
        "description": "Results from workspace self-checks",
        "mime_type": "application/json",
    },
    "version_info": {
        "description": "Kernel version and capability information",
        "mime_type": "application/json",
    },
}


def get_capability(tool_id: str) -> ToolCapability | None:
    """Get capability metadata for a tool."""
    return TOOL_REGISTRY.get(tool_id)


def get_workflow_bundle(workflow_class: str) -> list[str]:
    """Get the expected tool IDs for a workflow class."""
    return WORKFLOW_CAPABILITY_BUNDLES.get(workflow_class, WORKFLOW_CAPABILITY_BUNDLES.get("generic", []))


def get_tools_by_category(category: ToolCategory) -> list[ToolCapability]:
    """Get all tools in a specific category."""
    return [cap for cap in TOOL_REGISTRY.values() if cap.category == category]


def get_tools_by_approval_posture(posture: ApprovalPosture) -> list[ToolCapability]:
    """Get all tools with a specific approval posture."""
    return [cap for cap in TOOL_REGISTRY.values() if cap.approval_posture == posture]


def get_tools_by_workflow(workflow_class: str) -> list[ToolCapability]:
    """Get all tools that support a specific workflow."""
    return [
        cap for cap in TOOL_REGISTRY.values() 
        if workflow_class in cap.supported_workflows
    ]


def get_artifact_type(artifact_id: str) -> dict | None:
    """Get metadata for an artifact type."""
    return ARTIFACT_TYPES.get(artifact_id)


def to_capability_manifest() -> dict:
    """Generate a complete capability manifest for external consumption."""
    return {
        "version": "1.0.0",
        "tools": {
            tool_id: {
                "display_name": cap.display_name,
                "description": cap.description,
                "category": cap.category.value,
                "risk_level": cap.risk_level.value,
                "approval_posture": cap.approval_posture.value,
                "requires_owner": cap.requires_owner,
                "supported_workflows": cap.supported_workflows,
                "expected_artifacts": cap.expected_artifacts,
            }
            for tool_id, cap in TOOL_REGISTRY.items()
        },
        "workflows": {
            workflow: {"tools": tools}
            for workflow, tools in WORKFLOW_CAPABILITY_BUNDLES.items()
        },
        "artifacts": ARTIFACT_TYPES,
    }
