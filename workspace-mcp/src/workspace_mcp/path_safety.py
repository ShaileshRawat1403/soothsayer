import fnmatch
from pathlib import Path
from typing import List

class PathSafetyError(Exception):
    pass

def resolve_path(base_root: Path, target_path: str) -> Path:
    """
    Resolves a path relative to base_root and ensures it stays within base_root.
    """
    try:
        # Handle absolute paths that are actually within root
        p = Path(target_path)
        if p.is_absolute():
            try:
                # Try to make it relative to root to check containment
                rel = p.relative_to(base_root.resolve())
                final_path = base_root.resolve() / rel
            except ValueError:
                # It's absolute and not inside root
                raise PathSafetyError(f"Path {target_path} is outside workspace root")
        else:
            final_path = (base_root / target_path).resolve()

        # Strict containment check
        if not final_path.is_relative_to(base_root.resolve()):
            raise PathSafetyError(f"Path traversal detected: {target_path}")

        return final_path
    except Exception as e:
        if isinstance(e, PathSafetyError):
            raise
        raise PathSafetyError(f"Invalid path {target_path}: {str(e)}")

def validate_path(
    path: Path,
    root: Path,
    deny_globs: List[str],
    allow_paths: List[str] | None = None
) -> None:
    """
    Validates that a resolved path does not match any deny globs.
    """
    rel_path = str(path.relative_to(root))

    # Check deny globs
    for pattern in deny_globs:
        if fnmatch.fnmatch(rel_path, pattern):
            raise PathSafetyError(f"Path matches denied pattern '{pattern}': {rel_path}")

    # Enforce allow_paths when provided
    if allow_paths:
        normalized = rel_path.replace("\\", "/").lstrip("./")
        allowed_roots = [str(Path(p).as_posix()).lstrip("./") for p in allow_paths]
        if "" not in allowed_roots:
            in_allowlist = any(
                normalized == allowed or normalized.startswith(f"{allowed}/")
                for allowed in allowed_roots
            )
            if not in_allowlist:
                raise PathSafetyError(f"Path outside allow_paths: {rel_path}")

def is_safe_path(root: Path, target: str, deny_globs: List[str]) -> bool:
    try:
        p = resolve_path(root, target)
        validate_path(p, root, deny_globs)
        return True
    except PathSafetyError:
        return False
