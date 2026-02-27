import uuid
import hashlib
from typing import TYPE_CHECKING, Any, Dict, Literal, Optional
from pathlib import Path
from datetime import datetime, timezone
from .mcp_logging import logger
from .hashing import hash_arguments
from .response_schema import ToolResponse, Decision, Violation
from .store import BoundedStore

if TYPE_CHECKING:
    from .config import PolicyConfig

RiskLevel = Literal["read", "write", "execute", "network"]

class Governor:
    def __init__(self, config: "PolicyConfig", workspace_root: Path | None = None, strict: bool = False):
        self.config = config
        self.root = (workspace_root or Path(self.config.workspace_root)).resolve()
        self.strict = strict
        self.server_instance_id = str(uuid.uuid4())
        self.run_counter = 0
        self.config_hash = self.config.policy_hash

        # Bounded Stores
        self.runs = BoundedStore[str, Dict[str, Any]](max_size=config.max_runs, ttl_seconds=config.run_ttl_seconds)
        self.bundles = BoundedStore[str, Dict[str, Any]](max_size=config.max_bundles, ttl_seconds=config.bundle_ttl_seconds)
        self.audit_logs = BoundedStore[str, Dict[str, Any]](max_size=config.max_audit_logs, ttl_seconds=config.audit_ttl_seconds)
        self.event_logs = BoundedStore[str, Dict[str, Any]](max_size=config.max_audit_logs * 2, ttl_seconds=config.audit_ttl_seconds)

        if not self.root.exists():
            try:
                self.root.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.error(f"Failed to create workspace root: {e}")

    def _hash_args(self, arguments: Dict[str, Any]) -> str:
        """
        Deterministic salted hash for audit-safe argument fingerprints.
        """
        return hash_arguments({"args": arguments, "salt": self.server_instance_id})

    def get_meta(self, audit_id: str, tool_name: str, risk: RiskLevel, duration_ms: int = 0, output_truncated: bool = False, run_id: Optional[str] = None, owner_id: Optional[str] = None) -> Dict[str, Any]:
        meta = {
            "audit_id": audit_id,
            "tool": tool_name,
            "risk": risk,
            "decision": "allowed",
            "code": "success",
            "duration_ms": duration_ms,
            "config_hash": self.config_hash,
            "server_instance_id": self.server_instance_id,
            "run_counter": self.run_counter,
            "output_truncated": output_truncated,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "policy_hash": self.config_hash,
            "policy_profile": self.config.profile
        }
        if run_id:
            meta["run_id"] = run_id
        if owner_id:
            owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
            meta["owner_id_hash"] = owner_hash
            meta["owner_hint"] = owner_hash[:8]
        return meta

    def validate_action(
        self,
        tool_name: str,
        risk: RiskLevel,
        arguments: Dict[str, Any],
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        skip_audit: bool = False
    ) -> Decision:
        """
        Central policy enforcement point.
        """
        if not skip_audit:
            self.run_counter += 1
            
        audit_id = str(uuid.uuid4())
        decision_kind: Literal["allowed", "blocked", "error"] = "allowed"
        code = "success"
        violation: Optional[Violation] = None
        
        # Salted hash using server_instance_id
        arg_hash = self._hash_args(arguments)
        
        # 1. Check Owner/Run preconditions
        if run_id is not None:
            if not owner_id:
                decision_kind = "blocked"
                code = "blocked"
                violation = {"key": "OWNER_ID_REQUIRED", "details": {"run_id": run_id}, "config_path": ""}
            else:
                run = self.runs.get(run_id)
                if not run:
                    decision_kind = "error"
                    code = "not_found"
                    violation = {"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""}
                elif run.get("status") == "ended":
                    decision_kind = "error"
                    code = "invalid_input"
                    violation = {"key": "RUN_ALREADY_ENDED", "details": {"run_id": run_id}, "config_path": ""}
                else:
                    owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
                    if run.get("owner_hash") != owner_hash:
                        decision_kind = "error"
                        code = "not_found"
                        violation = {"key": "RUN_NOT_FOUND", "details": {"run_id": run_id}, "config_path": ""}
                        
        # Profile Guard (ci/strict)
        if decision_kind == "allowed" and (self.config.profile in ("ci", "strict")) and risk in ("write", "execute"):
            if not run_id:
                decision_kind = "blocked"
                code = "blocked"
                violation = {"key": "RUN_ID_REQUIRED", "details": {"profile": self.config.profile, "risk": risk}, "config_path": f"profiles.{self.config.profile}"}

        # 2. Check Policy constraints if still allowed
        if decision_kind == "allowed":
            try:
                if risk == "execute":
                    task_name = arguments.get("task_name")
                    if not isinstance(task_name, str) or task_name not in self.config.allow_tasks:
                        decision_kind = "blocked"
                        code = "blocked"
                        violation = {"key": "TASK_NOT_ALLOWLISTED", "details": {"task_name": task_name, "allowed": list(self.config.allow_tasks.keys())}, "config_path": f"profiles.{self.config.profile}.allow_tasks"}

                if risk == "read" and "path" in arguments:
                    target = arguments.get("path")
                    if isinstance(target, str):
                        if self._is_denied_by_glob(target):
                            decision_kind = "blocked"
                            code = "blocked"
                            violation = {"key": "PATH_MATCHES_DENY_GLOBS", "details": {"path": target}, "config_path": f"profiles.{self.config.profile}.deny_globs"}
                        elif not self._is_allowed_path(target):
                            decision_kind = "blocked"
                            code = "blocked"
                            violation = {"key": "PATH_OUTSIDE_ALLOW_PATHS", "details": {"path": target}, "config_path": f"profiles.{self.config.profile}.allow_paths"}

                if risk == "write":
                    paths_obj: Any = None
                    if "path" in arguments and isinstance(arguments.get("path"), str):
                        paths_obj = [arguments["path"]]
                    elif "paths" in arguments:
                        paths_obj = arguments.get("paths")
                    if isinstance(paths_obj, list):
                        paths = [str(p) for p in paths_obj]
                        if any(self._is_denied_by_glob(p) for p in paths):
                            decision_kind = "blocked"
                            code = "blocked"
                            violation = {"key": "PATH_MATCHES_DENY_GLOBS", "details": {"paths": paths}, "config_path": f"profiles.{self.config.profile}.deny_globs"}
                        elif any(not self._is_allowed_path(p) for p in paths):
                            decision_kind = "blocked"
                            code = "blocked"
                            violation = {"key": "PATH_OUTSIDE_ALLOW_PATHS", "details": {"paths": paths}, "config_path": f"profiles.{self.config.profile}.allow_paths"}

            except Exception as e:
                decision_kind = "error"
                code = "tool_failed"
                violation = {"key": "INTERNAL_ERROR", "details": {"error": str(e)}, "config_path": ""}
                
        # 3. Create Block Response if needed
        block_response = None
        if decision_kind != "allowed":
            meta = self.get_meta(audit_id, tool_name, risk, run_id=run_id, owner_id=owner_id)
            meta["decision"] = decision_kind
            meta["code"] = code
            if decision_kind == "blocked":
                block_response = ToolResponse.blocked(
                    reason="Policy violation detected by Governor",
                    policy_violation=violation or {"key": "UNKNOWN", "details": {}, "config_path": ""},
                    meta=meta
                )
            else:
                block_response = ToolResponse.error(
                    message="Action failed validation",
                    code=code, # type: ignore
                    details=violation,
                    meta=meta
                )

        # 4. Log Audit (if not skipped)
        if not skip_audit:
            self._log_audit(audit_id, tool_name, risk, decision_kind, code, arg_hash, violation, run_id, owner_id)
            
        return Decision(
            audit_id=audit_id,
            tool=tool_name,
            risk=risk,
            decision=decision_kind,
            code=code,
            violation=violation,
            block_response=block_response
        )

    def _log_audit(
        self,
        audit_id: str,
        tool: str,
        risk: str,
        decision: str,
        code: str,
        arg_hash: str,
        violation: Optional[Violation],
        run_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        duration_ms: int = 0
    ) -> None:
        """
        Writes structured audit log to BoundedStore.
        """
        log_entry = {
            "audit_id": audit_id,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tool": tool,
            "risk": risk,
            "decision": decision,
            "code": code,
            "args_sha256": arg_hash,
            "duration_ms": duration_ms,
            "policy_hash": self.config_hash,
            "policy_profile": self.config.profile,
            "server_instance_id": self.server_instance_id,
            "run_counter": self.run_counter
        }
        if violation:
            log_entry["violation"] = violation
        if run_id:
            log_entry["run_id"] = run_id
            
            run = self.runs.get(run_id)
            owner_hash = None
            if owner_id:
                owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
                
            if run and (not owner_hash or run.get("owner_hash") == owner_hash) and run.get("status") == "active":
                # Control-plane lifecycle tools should not skew run activity metrics.
                non_counted_tools = {"start_run", "end_run", "get_run_summary"}
                if tool in non_counted_tools:
                    self.audit_logs.set(audit_id, log_entry)
                    self.event_logs.set(audit_id, log_entry)
                    logger.info(f"AUDIT: {log_entry}")
                    return
                run["tool_sequence"].append(tool)
                run["risk_distribution"][risk] = run["risk_distribution"].get(risk, 0) + 1
                if decision == "allowed":
                    run["allowed_count"] += 1
                else:
                    run["blocked_count"] += 1
                self.runs.set(run_id, run)

        if owner_id:
            owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
            log_entry["owner_id_hash"] = owner_hash
            
        self.audit_logs.set(audit_id, log_entry)
        self.event_logs.set(audit_id, log_entry)
        logger.info(f"AUDIT: {log_entry}")

    def update_audit(self, audit_id: str, updates: Dict[str, Any]) -> None:
        """
        Update an existing audit log with additional fields like duration_ms.
        """
        entry = self.audit_logs.get(audit_id)
        if entry:
            entry.update(updates)
            self.audit_logs.set(audit_id, entry)
            self.event_logs.set(audit_id, entry)

    def get_root(self) -> Path:
        return self.root

    def _is_denied_by_glob(self, rel_path: str) -> bool:
        from fnmatch import fnmatch

        normalized = rel_path.replace("\\", "/").lstrip("./")
        return any(fnmatch(normalized, pattern) for pattern in self.config.deny_globs)

    def _is_allowed_path(self, rel_path: str) -> bool:
        normalized = rel_path.replace("\\", "/").lstrip("./")
        allowed_roots = [str(Path(p).as_posix()).lstrip("./") for p in self.config.allow_paths]
        if "" in allowed_roots:
            return True
        return any(
            normalized == allowed or normalized.startswith(f"{allowed}/")
            for allowed in allowed_roots
        )
