import logging
import sys


def setup_logging(name: str = "workspace_mcp") -> logging.Logger:
    """
    Configure logger to stderr only so stdout stays clean for MCP transport.
    """
    configured_logger = logging.getLogger(name)
    configured_logger.setLevel(logging.INFO)

    if configured_logger.handlers:
        configured_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stderr)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    configured_logger.addHandler(handler)
    configured_logger.propagate = False
    return configured_logger


logger = setup_logging()
