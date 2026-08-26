# EnvBoard — Project Structure

## Full Tree

```
EnvBoard/
├── main.go                        ← entry point: wires router, middleware, DB, starts server
├── go.mod                         ← Go module definition + dependency list
├── go.sum                         ← dependency checksums (auto-generated, don't edit)
│
├── model/
│   └── model.go                   ← Go structs that mirror DB tables
│
├── store/                         ← repository layer: ONLY place that writes SQL
│   ├── store.go                   ← DB connection (NewDB)
│   ├── user.go                    ← queries: users table
│   ├── environment.go             ← queries: environments table
│   ├── hold.go                    ← queries: holds table (SELECT FOR UPDATE lives here)
│   ├── history.go                 ← append-only inserts to history table
│   └── log.go                     ← inserts to logs + admin_actions tables
│
├── service/                       ← business logic layer: rules, workflows, transactions
│   ├── auth.go                    ← login: bcrypt verify + JWT sign; no HTTP here
│   ├── environment.go             ← env rules: name uniqueness, active check
│   ├── hold.go                    ← hold rules: max-2 check, expiry check, claim workflow
│   ├── history.go                 ← audit trail: decides when + what to log
│   └── admin.go                   ← user management rules, admin action logging
│
├── handler/                       ← HTTP layer: decode request → call service → encode response
│   ├── auth.go                    ← POST /api/auth/login
│   ├── environment.go             ← GET/POST/PATCH /api/environments
│   ├── hold.go                    ← POST/PATCH/DELETE /api/holds
│   ├── board.go                   ← GET /api/board + GET /api/board/stream (SSE)
│   ├── history.go                 ← GET /api/environments/:id/history
│   └── admin.go                   ← /api/admin/* (users, logs, actions)
│
├── middleware/
│   ├── auth.go                    ← validates JWT, attaches user{id,role} to context
│   └── ratelimit.go               ← per-user write action limiter (20 req/min)
│
├── web/                           ← React frontend
│   ├── package.json
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx               ← React entry point
│   │   ├── App.jsx                ← root component + routing
│   │   ├── api/                   ← all fetch calls to Go backend
│   │   │   ├── client.js          ← base fetch wrapper (attaches JWT header)
│   │   │   ├── auth.js            ← login call
│   │   │   ├── board.js           ← board + SSE
│   │   │   ├── holds.js           ← claim, extend, release, reclaim
│   │   │   ├── environments.js    ← env CRUD
│   │   │   └── history.js         ← history fetch
│   │   ├── components/            ← reusable UI pieces
│   │   │   ├── EnvironmentCard/   ← one card on the board
│   │   │   ├── ClaimModal/        ← purpose + duration form
│   │   │   ├── ExtendModal/       ← add minutes form
│   │   │   ├── ReclaimModal/      ← admin reclaim + reason form
│   │   │   └── HistoryList/       ← audit log display
│   │   ├── pages/                 ← full page views
│   │   │   ├── LoginPage.jsx
│   │   │   ├── BoardPage.jsx      ← main board (SSE-connected)
│   │   │   ├── HistoryPage.jsx    ← per-environment history
│   │   │   └── admin/
│   │   │       ├── EnvironmentsPage.jsx   ← env CRUD
│   │   │       ├── UsersPage.jsx          ← user management
│   │   │       └── LogsPage.jsx           ← system logs + admin actions
│   │   ├── hooks/
│   │   │   ├── useSSE.js          ← manages SSE connection + reconnect
│   │   │   └── useAuth.js         ← reads/writes JWT from localStorage
│   │   └── context/
│   │       └── AuthContext.jsx    ← current user available app-wide
│   └── dist/                      ← compiled React build (Go serves this as static files)
│
├── schema.sql                     ← base schema — run once to create all tables
├── migrations/                    ← schema changes after base (numbered, append-only)
│   └── README.md
│
└── docs/
    ├── CHECKLIST.md
    ├── REQUIREMENTS.md
    ├── ARCHITECTURE.md
    ├── API_CONTRACT.md
    ├── DB_SCHEMA_README.md
    └── PROJECT_STRUCTURE.md       ← this file
```

---

## What Each Layer Is Responsible For

### `model/` — Data shapes
- Pure Go structs. No logic, no DB calls.
- Every struct maps to one DB table.
- Used by both `store/` and `handler/` — it's the shared language between layers.

### `store/` — Repository (database access)
- The only layer that writes SQL.
- Each file maps to one DB table.
- Functions take plain Go values in, return typed structs (or errors) out.
- `hold.go` owns the `SELECT FOR UPDATE` transaction — the most critical code in the project.
- No business rules here — pure persistence.

### `service/` — Business logic
- Sits between handler and store.
- Owns all business rules: "can this user claim?", "is the hold expired?", "max 2 holds".
- Calls store functions; does not write SQL itself.
- Handles authorization rules (e.g. "only the holder can extend").
- Coordinates multi-step workflows (e.g. claim = check + insert hold + insert history).

### `handler/` — HTTP layer
- Reads the HTTP request (URL params, body, headers).
- Validates input format (is the field present? is it a valid number?).
- Calls one service function.
- Writes the HTTP response (JSON + status code).
- No business logic, no SQL.

### `middleware/` — Cross-cutting concerns
- Runs before every handler (or a subset of handlers).
- `auth.go`: validates JWT → puts `userID` and `role` into request context.
- `ratelimit.go`: checks write action count per user → returns 429 if exceeded.

### `web/src/api/` — Frontend ↔ Backend bridge
- One file per resource (auth, holds, environments, etc.).
- All `fetch()` calls live here — pages and components never call `fetch()` directly.
- `client.js` is the base: reads JWT from localStorage, attaches `Authorization` header.

### `web/src/components/` — Reusable UI
- Small, focused UI pieces used by multiple pages.
- Each component has its own folder (e.g. `ClaimModal/`) with the JSX file inside.

### `web/src/pages/` — Full views
- One file per route/screen.
- Pages compose components and call `api/` functions.
- `BoardPage.jsx` is the most complex — it connects to SSE and manages live state.

### `web/src/hooks/` — Reusable behaviour
- `useSSE.js`: opens EventSource, handles reconnect on disconnect.
- `useAuth.js`: read/write the current user + JWT.

### `web/src/context/` — Global state
- `AuthContext.jsx`: stores logged-in user. Wraps the whole app so any component can read it.

---

## Key Rules

| Rule | Why |
|---|---|
| Only `store/` touches MySQL | Keeps SQL in one place; handlers are easy to test |
| Only `web/src/api/` calls `fetch()` | Centralises auth header + error handling |
| `model/` has no imports from `store/` or `handler/` | Prevents circular dependencies |
| `web/dist/` is committed to git | Go serves it as static files — no separate deploy needed |
| `migrations/` is append-only | Never edit an existing migration; add a new one |

---

## How the Two Sides Connect

```
React (web/src/)                     Go (root)
─────────────────                    ─────────────────────────
api/board.js          ──HTTP──►      handler/board.go
  EventSource         ──SSE──►       handler/board.go (stream)
api/holds.js          ──HTTP──►      handler/hold.go
api/auth.js           ──HTTP──►      handler/auth.go
api/environments.js   ──HTTP──►      handler/environment.go
api/history.js        ──HTTP──►      handler/history.go
(admin pages)         ──HTTP──►      handler/admin.go
```

Go also serves `web/dist/` as static files on `GET /*` — so there's one server, one port.

