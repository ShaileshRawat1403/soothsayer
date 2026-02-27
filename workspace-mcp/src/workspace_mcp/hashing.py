import hashlib
import json
from typing import Any

def hash_arguments(args: Any) -> str:
    """
    Produces a deterministic SHA-256 hash of a JSON-serializable object.
    Used for audit logging without exposing sensitive argument data.
    """
    try:
        # sort_keys=True ensures deterministic JSON representation
        canonical_json = json.dumps(args, sort_keys=True, default=str)
        return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
    except Exception:
        return "hash_error"
