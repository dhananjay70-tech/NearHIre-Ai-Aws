"""
logger.py — Structured logging to console + rotating file (logs/scraper.log).

Every provider, scraper, and service uses `get_logger(__name__)` so run output
is traceable (which source produced/failed how many jobs).
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

from app.config import settings

_LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
_CONFIGURED = False


def _configure_root() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    os.makedirs(_LOG_DIR, exist_ok=True)
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger("jobscraper")
    root.setLevel(level)
    root.propagate = False

    if not root.handlers:
        console = logging.StreamHandler(sys.stdout)
        console.setFormatter(fmt)
        root.addHandler(console)

        try:
            file_handler = RotatingFileHandler(
                os.path.join(_LOG_DIR, "scraper.log"),
                maxBytes=2_000_000,
                backupCount=3,
                encoding="utf-8",
            )
            file_handler.setFormatter(fmt)
            root.addHandler(file_handler)
        except Exception:
            # File logging is best-effort; console logging always works.
            pass

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    _configure_root()
    return logging.getLogger(f"jobscraper.{name}")
