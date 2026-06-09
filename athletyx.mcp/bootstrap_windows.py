"""
Bootstrap local development on Windows: portable Postgres + schema + .env.

Downloads PostgreSQL 16 Windows binaries on first run, starts the server on
port 5433 (avoids conflicts with an existing install on 5432), writes .env,
and applies schema.sql.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT / ".local"
PG_ROOT = LOCAL / "pgsql"
PGDATA = LOCAL / "pgdata"
PG_LOG = LOCAL / "postgres.log"
ENV_FILE = ROOT / ".env"
ZIP_URL = (
    "https://get.enterprisedb.com/postgresql/"
    "postgresql-16.9-1-windows-x64-binaries.zip"
)
ZIP_PATH = LOCAL / "postgresql-16-binaries.zip"
PG_PORT = "5433"


def _log(message: str) -> None:
    print(message, file=sys.stderr)


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kwargs)


def _pg_bin(name: str) -> Path:
    return PG_ROOT / "bin" / f"{name}.exe"


def _ensure_postgres_binaries() -> None:
    if _pg_bin("initdb").exists():
        return

    LOCAL.mkdir(parents=True, exist_ok=True)
    _log(f"Downloading PostgreSQL 16 binaries (one-time, ~350MB)...")
    urlretrieve(ZIP_URL, ZIP_PATH)

    _log("Extracting binaries...")
    with zipfile.ZipFile(ZIP_PATH, "r") as archive:
        archive.extractall(LOCAL)

    extracted = LOCAL / "pgsql"
    if not extracted.exists():
        raise RuntimeError(f"Expected Postgres bundle missing at {extracted}")

    _log(f"Postgres binaries installed at {PG_ROOT}")


def _init_and_start_postgres() -> None:
    if not (PGDATA / "PG_VERSION").exists():
        _log("Initializing local PostgreSQL data directory...")
        _run(
            [
                str(_pg_bin("initdb")),
                "-D",
                str(PGDATA),
                "-U",
                "postgres",
                "--auth=trust",
                "--encoding=UTF8",
                "--no-instructions",
            ]
        )

    ready = subprocess.run(
        [str(_pg_bin("pg_isready")), "-h", "localhost", "-p", PG_PORT],
        capture_output=True,
        text=True,
    )
    if ready.returncode == 0:
        _log(f"PostgreSQL already running on localhost:{PG_PORT}")
        return

    _log(f"Starting PostgreSQL on localhost:{PG_PORT}...")
    _run(
        [
            str(_pg_bin("pg_ctl")),
            "-D",
            str(PGDATA),
            "-l",
            str(PG_LOG),
            "-o",
            f"-p {PG_PORT} -h localhost",
            "start",
        ]
    )

    for _ in range(30):
        if subprocess.run(
            [str(_pg_bin("pg_isready")), "-h", "localhost", "-p", PG_PORT],
            capture_output=True,
        ).returncode == 0:
            _log("PostgreSQL is ready.")
            return
        time.sleep(0.5)

    raise RuntimeError("PostgreSQL failed to become ready; see .local/postgres.log")


def _write_env() -> None:
    ENV_FILE.write_text(
        "\n".join(
            [
                "DB_HOST=localhost",
                f"DB_PORT={PG_PORT}",
                "DB_NAME=postgres",
                "DB_USER=postgres",
                "DB_PASSWORD=postgres",
                "",
            ]
        ),
        encoding="utf-8",
    )
    _log(f"Wrote {ENV_FILE.name}")


def _apply_schema() -> None:
    from setup_db import main as apply_schema

    apply_schema()


def main() -> int:
    _ensure_postgres_binaries()
    _init_and_start_postgres()
    _write_env()
    _apply_schema()
    _log(f"Bootstrap complete. Postgres: localhost:{PG_PORT}")
    _log("Claude Desktop / Cursor: reload MCP after updating config.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        _log(f"Bootstrap failed: {exc}")
        raise SystemExit(1) from exc
