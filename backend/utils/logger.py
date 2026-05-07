import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def configure_logging(app):
    log_dir = Path(app.root_path).parent / "logs"
    log_dir.mkdir(exist_ok=True)

    handler = RotatingFileHandler(log_dir / "app.log", maxBytes=1_000_000, backupCount=3)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )
    handler.setFormatter(formatter)
    handler.setLevel(getattr(logging, app.config["LOG_LEVEL"].upper(), logging.INFO))

    app.logger.setLevel(handler.level)
    app.logger.addHandler(handler)
