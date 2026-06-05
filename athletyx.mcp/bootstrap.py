"""
Bootstrap local development: Postgres (no Homebrew) + schema + .env.

Downloads Postgres.app binaries on first run, starts the server on port 5432,
writes .env, and applies schema.sql.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT / ".local"
PG_ROOT = LOCAL / "postgresapp-16"
PGDATA = LOCAL / "pgdata"
PG_LOG = LOCAL / "postgres.log"
ENV_FILE = ROOT / ".env"
DMG_URL = (
    "https://github.com/PostgresApp/PostgresApp/releases/download/v2.9.5/"
    "Postgres-2.9.5-16.dmg"
)
DMG_PATH = LOCAL / "Postgres-16.dmg"


def _log(message: str) -> None:
    print(message, file=sys.stderr)


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kwargs)


def _pg_bin(name: str) -> Path:
    return PG_ROOT / "bin" / name


def _ensure_postgres_binaries() -> None:
    if _pg_bin("initdb").exists():
        return

    LOCAL.mkdir(parents=True, exist_ok=True)
    _log("Downloading Postgres.app 16 binaries (one-time, ~70MB)...")
    urlretrieve(DMG_URL, DMG_PATH)

    mount_output = _run(["hdiutil", "attach", str(DMG_PATH), "-nobrowse", "-quiet"])
    mount_line = mount_output.stdout.strip().splitlines()[-1]
    mount_point = Path(mount_line.split("\t")[-1].strip())

    try:
        source = mount_point / "Postgres.app" / "Contents" / "Versions" / "16"
        if not source.exists():
            raise RuntimeError(f"Expected Postgres bundle missing at {source}")
        shutil.copytree(source, PG_ROOT)
    finally:
        _run(["hdiutil", "detach", str(mount_point), "-quiet"])

    _log(f"Postgres binaries installed at {PG_ROOT}")


def _init_and_start_postgres() -> None:
    if not (PGDATA / "PG_VERSION").exists():
        _log("Initializing local PostgreSQL data directory...")
        _run([str(_pg_bin("initdb")), "-D", str(PGDATA), "-U", "postgres", "--auth=trust", "--no-instructions"])

    ready = subprocess.run(
        [str(_pg_bin("pg_isready")), "-h", "localhost", "-p", "5432"],
        capture_output=True,
        text=True,
    )
    if ready.returncode == 0:
        _log("PostgreSQL already running on localhost:5432")
        return

    _log("Starting PostgreSQL on localhost:5432...")
    _run(
        [
            str(_pg_bin("pg_ctl")),
            "-D",
            str(PGDATA),
            "-l",
            str(PG_LOG),
            "-o",
            "-p 5432 -h localhost",
            "start",
        ]
    )

    for _ in range(20):
        if subprocess.run(
            [str(_pg_bin("pg_isready")), "-h", "localhost", "-p", "5432"],
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
                "DB_PORT=5432",
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
    _log("Bootstrap complete. Run: python3 server.py")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        _log(f"Bootstrap failed: {exc}")
        raise SystemExit(1) from exc
