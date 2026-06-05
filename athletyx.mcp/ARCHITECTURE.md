# Athletyx MCP — Architecture Map

Code, MCP servers, and database layout for the `athletyx.mcp` Python MCP server and its clients (Cursor, Claude Desktop).

---

## System overview

```mermaid
flowchart TB
    subgraph clients["AI clients (stdio)"]
        Cursor["Cursor IDE<br/>.cursor/mcp.json"]
        Claude["Claude Desktop<br/>claude_desktop_config.json"]
    end

    subgraph mcp_layer["MCP servers"]
        UserData["athletyx-user-data<br/>athletyx.mcp/server.py"]
        PostgresStorage["athletyx-postgres-storage<br/>@modelcontextprotocol/server-postgres"]
    end

    subgraph python_app["athletyx.mcp (Python)"]
        Server["server.py<br/>FastMCP tools"]
        DBMod["db.py<br/>parameterized SQL"]
        Models["models.py<br/>Pydantic schemas"]
        Setup["setup_db.py / bootstrap.py"]
    end

    subgraph databases["PostgreSQL"]
        LocalPG["Local Postgres :5432<br/>users table (MCP profile)"]
        SupabasePG["Supabase local :54322<br/>public.users (UUID identity)"]
    end

    Cursor -->|spawns| UserData
    Claude -->|spawns| UserData
    Cursor -->|spawns| PostgresStorage

    UserData --> Server
    Server --> DBMod
    DBMod --> Models
    DBMod -->|psycopg2| LocalPG
    Setup -->|schema.sql| LocalPG

    PostgresStorage -->|read-only SQL| SupabasePG
```

---

## Directory map

```
Athletyx-Fitness/
├── .cursor/
│   └── mcp.json                 # Cursor MCP client config (project-level)
│
├── athletyx.mcp/                # Custom Python MCP server (this package)
│   ├── server.py                # Entry point — FastMCP + 3 read-only tools
│   ├── db.py                    # PostgreSQL access (bound parameters only)
│   ├── models.py                # User, UserQueryResult, UserListResult
│   ├── schema.sql               # users table DDL + seed rows
│   ├── setup_db.py              # Apply schema via psycopg2
│   ├── bootstrap.py             # One-shot local dev setup (Postgres + schema + .env)
│   ├── requirements.txt         # mcp[cli], psycopg2-binary, pydantic, python-dotenv
│   ├── docker-compose.yml       # Optional Postgres via Docker
│   ├── .env.example             # DB_* template
│   ├── .gitignore               # .env, .local/, __pycache__
│   └── ARCHITECTURE.md          # This file
│
└── supabase/
    ├── migrations/
    │   └── 20260529120000_create_users_table.sql   # Separate identity store (UUID)
    └── schema.sql               # IronLog profiles / app schema
```

**Not committed (local only):**

| Path | Purpose |
|------|---------|
| `athletyx.mcp/.env` | DB credentials |
| `athletyx.mcp/.local/` | Embedded Postgres binaries + data dir |

---

## MCP servers

### 1. `athletyx-user-data` (custom Python)

| Field | Value |
|-------|-------|
| Transport | stdio |
| Runtime | Python 3.10+ (`mcp.server.fastmcp`) |
| Config (Cursor) | `.cursor/mcp.json` |
| Config (Claude) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Entry | `athletyx.mcp/server.py` |

**Tools (read-only):**

| Tool | Input | Query |
|------|-------|-------|
| `get_user_by_id` | `user_id: int` | `SELECT … FROM users WHERE id = %s` |
| `get_user_by_email` | `email: str` | `SELECT … FROM users WHERE lower(email) = lower(%s)` |
| `search_users_by_profile` | `fitness_goal?`, `experience_level?`, `limit?` | Filtered `SELECT` with capped `LIMIT` |

**Request flow:**

```
Client → stdin JSON-RPC → server.py → db.py → PostgreSQL → Pydantic → JSON response → stdout
Logs only → stderr (stdio protocol safety)
```

### 2. `athletyx-postgres-storage` (generic Node MCP)

| Field | Value |
|-------|-------|
| Transport | stdio |
| Runtime | `npx @modelcontextprotocol/server-postgres` |
| Target | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Purpose | Ad-hoc read-only SQL against Supabase local (schema inspection) |

---

## Database map

Two **separate** `users` concepts exist in this repo:

### A. MCP fitness profile table (`athletyx.mcp`)

Used by `athletyx-user-data` on **local Postgres :5432**.

```sql
users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  fitness_goal    VARCHAR(100) NOT NULL,
  experience_level VARCHAR(50) NOT NULL
)
```

**Seed data:** Alex Rivera, Jordan Lee, Sam Patel (`schema.sql`).

**Connection env vars:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

### B. Supabase identity table (`supabase/migrations/…`)

Used by the main Athletyx app and `athletyx-postgres-storage` on **:54322**.

```sql
public.users (
  user_id     UUID PRIMARY KEY,   -- immutable
  email       VARCHAR(255) UNIQUE,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)
```

No `fitness_goal` / `experience_level` here — that lives in IronLog `profiles` (`supabase/schema.sql`).

---

## Code dependency graph

```mermaid
flowchart LR
    server["server.py"] --> db["db.py"]
    server --> models["models.py"]
    db --> models
    db --> psycopg2["psycopg2-binary"]
    db --> dotenv["python-dotenv"]
    server --> fastmcp["mcp.server.fastmcp"]

    setup_db["setup_db.py"] --> db
    bootstrap["bootstrap.py"] --> setup_db
```

| File | Role |
|------|------|
| `server.py` | MCP tool definitions, error envelopes, `mcp.run(transport="stdio")` |
| `db.py` | Connection per request; no dynamic SQL from user input |
| `models.py` | Validates rows and tool response shape |
| `setup_db.py` | Executes `schema.sql` in one transaction |
| `bootstrap.py` | Downloads Postgres.app binaries, starts DB, writes `.env`, runs setup |

---

## Client configuration

### Cursor

Edit `.cursor/mcp.json`, then **Cmd+Shift+P → Developer: Reload Window**.

Update `args[0]` to your machine’s absolute path to `server.py`, or keep the repo path if cloned to the same location.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`, then **fully quit** (Cmd+Q) and reopen.

Use the **full** `python3` path (Claude may not inherit shell `PATH`):

```
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
```

See `claude_desktop_config.example.json` in this folder for a copy-paste template.

---

## Local setup (quick reference)

```bash
cd athletyx.mcp
python3 -m pip install -r requirements.txt
python3 bootstrap.py          # Postgres + schema + .env
# Do NOT run server.py manually — clients spawn it over stdio
```

Refresh MCP in Cursor: **Settings → MCP** toggle off/on, or reload window.

---

## Security notes

- All MCP tools are **read-only**; mutations are not exposed.
- SQL uses **parameterized** queries (`%s` placeholders) only.
- Secrets belong in `.env` or client `env` blocks — never commit `.env`.
- `athletyx-postgres-storage` can run arbitrary read SQL; restrict to dev.
