"""Apply schema.sql using psycopg2 (no psql CLI required)."""

from __future__ import annotations

import sys
from pathlib import Path

from db import get_connection


def main() -> int:
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    print(f"Applying schema from {schema_path.name} ...", file=sys.stderr)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()

    print("Schema applied successfully.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Failed to apply schema: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
