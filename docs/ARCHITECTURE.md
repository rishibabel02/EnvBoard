# EnvBoard — Architecture

## 1. System Overview

EnvBoard is a monolith: one Go binary, one MySQL database. No microservices, no cache, no message broker in v1.

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
│   Browser 1      Browser 2      Browser 3      Browser N   │
└───────┬──────────────┬──────────────┬───────────────┬───────┘
        │  HTTP / SSE  │              │               │
        ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│   Go Pod 1       │     │   Go Pod 2       │   ← stateless; any pod serves any request
│                  │     │                  │
│  middleware      │     │  middleware      │
│  handler         │     │  handler         │
│  store           │     │  store           │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └───────────┬────────────┘
                     ▼
          ┌─────────────────────┐
          │       MySQL         │
          │  (single source     │
          │   of truth)         │
          └─────────────────────┘
```

---

## 2. Frontend Architecture

React SPA (Single Page Application). The Go server serves the compiled React build as static files — no separate frontend server needed.

```
React (browser)
    │
    ├── REST calls (JSON over HTTP)  → Go API
    └── SSE connection               → Go /board/stream endpoint
                                          └── polls MySQL every 1–2s
                                              pushes diff to browser
```

---

## 3. Go Package Structure

4-layer stack. Each layer has one job and calls only the layer below it.

```
handler/  →  service/  →  store/  →  MySQL
```

```
envboard/
├── main.go               ← wires router, middleware, DB; starts server
├── go.mod
├── go.sum
│
├── model/
│   └── model.go          ← Go structs mirroring DB tables; shared across all layers
│
├── store/                ← repository: SQL only, no business rules
│   ├── store.go          ← DB connection, NewDB()
│   ├── user.go
│   ├── environment.go
│   ├── hold.go           ← SELECT FOR UPDATE lives here
│   ├── history.go
│   └── log.go
│
├── service/              ← business logic: rules, workflows, auth checks
│   ├── auth.go           ← bcrypt verify, JWT sign — no HTTP
│   ├── environment.go
│   ├── hold.go           ← max-2 rule, expiry check, claim workflow
│   ├── history.go
│   └── admin.go
│
├── handler/              ← HTTP only: decode → call service → encode
│   ├── auth.go
│   ├── environment.go
│   ├── hold.go
│   ├── board.go          ← SSE goroutine lives here
│   ├── history.go
│   └── admin.go
│
├── middleware/
│   ├── auth.go           ← JWT validation, attaches user to context
│   └── ratelimit.go
│
└── docs/
```

**Rules:**
- `handler` calls `service` only — never `store` directly
- `service` calls `store` only — never writes SQL itself
- `store` calls MySQL only — no business rules
- `model` is imported by all layers — it's the shared data language

---

## 4. Request Lifecycle

Every request follows the same path:

```
Browser
  │  HTTP Request
  ▼
Router
  │
  ▼
middleware/auth.go
  └── validates JWT → attaches user{id, role} to context → 401 if missing/invalid
  │
  ▼
middleware/ratelimit.go  (write routes only)
  └── checks per-user count → 429 if exceeded
  │
  ▼
handler/xxx.go
  └── decode + validate request body/params
  └── call service function
  └── encode + send response
  │
  ▼
service/xxx.go
  └── enforce business rules (role check, hold limits, expiry check)
  └── coordinate multi-step workflow
  └── call store functions
  │
  ▼
store/xxx.go
  └── run SQL against MySQL
  └── return typed structs or error
  │
  ▼
handler sends HTTP response
```

---

## 5. Critical Data Flows

### 5a. Claiming an Environment (the hard one)

```
POST /holds
  │
  ├── middleware: auth ✓, rate limit ✓
  │
  ├── handler: parse body (environment_id, purpose, duration_minutes)
  │
  └── store.ClaimEnvironment(tx):
        BEGIN TRANSACTION
          SELECT id FROM holds
            WHERE environment_id = ? AND status = 'active' AND expires_at > NOW()
            FOR UPDATE                         ← locks the row; second request waits here
          
          if row exists → ROLLBACK → return "taken by X"
          
          SELECT COUNT(*) FROM holds
            WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
          
          if count >= 2 → ROLLBACK → return "hold limit reached"
          
          INSERT INTO holds (...)             ← claim succeeds
          INSERT INTO history (action='claimed', ...)
        COMMIT
```

Two simultaneous claims on the same environment: MySQL serializes them at the `FOR UPDATE` lock. Exactly one wins.

### 5b. Expiry (no background job)

There is no cron job. Every query that reads hold status does this inline:

```sql
-- treat a hold as expired if expires_at has passed, regardless of status column
WHERE status = 'active' AND expires_at > NOW()
```

When a query first encounters an expired hold, it:
1. Updates `status = 'expired'` on that hold
2. Inserts a `action='expired'` row into history
Both in the same transaction as the read.

### 5c. Live Board (SSE)

```
Browser connects to GET /board/stream
  │
  └── Go opens an SSE goroutine for this connection
        every 1–2 seconds:
          SELECT all environments + active holds from MySQL
          compare with last snapshot
          if anything changed → push JSON event to browser
          if nothing changed → send SSE comment (:keepalive) to hold connection open
        
        goroutine exits when browser disconnects
```

All pods poll MySQL independently. No coordination needed — MySQL is the shared state.

---

## 6. Auth Design

- **Login:** `POST /login` → validates email + bcrypt password → returns signed JWT
- **JWT payload:** `{ user_id, role, exp }`
- **Every request:** `Authorization: Bearer <token>` header → middleware validates → user attached to `context`
- **Role check:** handler reads role from context — if not admin, return 403

No session table. No server-side token store. Stateless by design.

---

## 7. Key Architectural Decisions

| Decision | Chosen approach | Why |
|---|---|---|
| Locking | MySQL SELECT FOR UPDATE | No external coordinator needed; MySQL already serializes at row level |
| Expiry | Read-time computation (`expires_at > NOW()`) | Correct across all pods with zero coordination; no background job to fail |
| Live updates | SSE + MySQL polling | No broker in v1; simple, stateless, one goroutine per connection |
| Auth | JWT | Stateless; works across multiple pods without shared session store |
| Frontend | React SPA served by Go | Single deployment artifact; no separate frontend server |
| DB driver | `go-sql-driver/mysql` | Standard, battle-tested Go MySQL driver |
