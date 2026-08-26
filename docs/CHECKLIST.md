# EnvBoard — Implementation Checklist

## SDLC Progress
- [x] Requirements
- [x] Checklist
- [x] Architecture
- [x] API Contract
- [x] Project Setup
- [x] Slice 1: Auth (backend ✓, React pending)
- [x] Slice 2: Board (backend ✓, React pending)
- [x] Slice 3: Environments (backend ✓, React pending)
- [x] Slice 4: Holds (backend ✓, React pending)
- [x] Slice 5: History (backend ✓, React pending)
- [x] Slice 6: Admin (backend ✓, React pending)
- [ ] Slice 6: Admin
- [ ] Integration
- [ ] Testing

---

## Phase 1: Requirements
- [x] Functional requirements defined (docs/REQUIREMENTS.md)
- [x] Non-functional requirements defined (docs/REQUIREMENTS.md)

---

## Phase 2: Architecture
- [x] System diagram (docs/ARCHITECTURE.md)
- [x] Go package structure defined
- [x] Request lifecycle documented
- [x] Critical data flows documented (claim, expiry, SSE)
- [x] Auth design documented
- [x] Key architectural decisions recorded

---

## Phase 3: ER Diagram + DB Design
- [x] `users` table — id, name, email, password_hash, role, is_active, created_at, updated_at
- [x] `environments` table — id, name, description, console_url, is_active, created_at, updated_at
- [x] `holds` table — id, environment_id, user_id, purpose, started_at, expires_at, released_at, status
- [x] `history` table — id, environment_id, user_id, hold_id, action, reason, created_at
- [x] `logs` table — id, user_id (nullable), event, ip_address, user_agent, details, created_at
- [x] `admin_actions` table — id, admin_id, action, target_type, target_id, details, created_at
- [x] Indexes on holds (environment_id, status) and (user_id, status)
- [x] Indexes on logs (user_id) and (created_at)
- [x] Index on admin_actions (admin_id)
- [x] Foreign key constraints on all tables
- [x] Database created and schema verified in MySQL Workbench
- [x] DB Schema README — per-table docs with purpose, PK, FKs, relationships, constraints, indexes, type reasoning (docs/DB_SCHEMA_README.md)
- [x] Migration convention established (migrations/README.md) — schema.sql is base, future changes go in migrations/

---

## Phase 4: API Contract
- [x] Auth endpoints defined (POST /api/auth/login)
- [x] Board endpoints defined (GET /api/board, GET /api/board/stream)
- [x] Environment endpoints defined (GET, POST, PATCH, PATCH /status)
- [x] Hold endpoints defined (claim, extend, release, reclaim)
- [x] History endpoint defined (GET /api/environments/:id/history)
- [x] Admin endpoints defined (user mgmt, audit, logs)
- [x] Error response format standardized (code + message)
- [x] API contract written (docs/API_CONTRACT.md)

---

## Phase 5: Project Setup
- [x] `go mod init envboard`
- [x] Folders created: `model/`, `store/`, `service/`, `handler/`, `middleware/`
- [x] Dependencies installed: `go-sql-driver/mysql`, `golang-jwt/jwt`, `golang.org/x/crypto`
- [x] `store/store.go` — NewDB() connection verified from Go
- [ ] React app scaffolded: `cd web && npm create vite@latest` ← later

---

## Phase 6: Slice 1 — Authentication ✓
> Goal: login works end-to-end. Guest blocked from protected routes.

### Backend ✓
- [x] `model/model.go` — User struct
- [x] `store/user.go` — GetByEmail, GetByID, CreateUser, ListUsers, UpdateRole, SetActive, UpdatePassword
- [x] `service/errors.go` — all sentinel errors
- [x] `service/auth.go` — Login (bcrypt verify + JWT sign), HashPassword, ParseToken
- [x] `handler/auth.go` — POST /api/auth/login
- [x] `middleware/auth.go` — validate JWT, attach user to context, AdminOnly, helpers
- [x] `cmd/seed/main.go` — seed script for test user
- [x] Manual test: POST /api/auth/login returns token ✓

### React (pending — backend-first)
- [ ] `web/src/api/client.js` — base fetch wrapper with JWT header
- [ ] `web/src/api/auth.js` — login API call
- [ ] `web/src/context/AuthContext.jsx` — store logged-in user
- [ ] `web/src/hooks/useAuth.js` — read/write JWT + user
- [ ] `web/src/pages/LoginPage.jsx` — login form
- [ ] End-to-end test: login → token stored → redirected ✓

---

## Phase 7: Slice 2 — Board (Live View) ✓
> Goal: board loads and updates in real time.

### Backend ✓
- [x] `model/model.go` — Environment, Hold, BoardEntry, BoardHoldInfo structs
- [x] `store/environment.go` — ListEnvironments()
- [x] `store/hold.go` — GetActiveHoldsForBoard() → map[envID]ActiveHold
- [x] `service/board.go` — GetBoardState() (computes status + countdown at read time)
- [x] `handler/board.go` — GET /api/board (snapshot)
- [x] `handler/board.go` — GET /api/board/stream (SSE, polls every 2s)
- [x] Manual test: GET /api/board returns board JSON ✓
- [x] Manual test: GET /api/board/stream sends SSE events ✓

### React (pending — backend-first)
- [ ] `web/src/api/board.js` — fetch + SSE client
- [ ] `web/src/hooks/useSSE.js` — SSE connection + reconnect
- [ ] `web/src/pages/BoardPage.jsx` — renders environment cards
- [ ] `web/src/components/EnvironmentCard/` — status badge + countdown

---

## Phase 8: Slice 3 — Environments (Admin CRUD) ✓ (backend)
> Goal: admin can create, edit, toggle environments.

### Backend ✓
- [x] `store/environment.go` — CreateEnvironment, UpdateEnvironment, SetEnvironmentActive
- [x] `service/environment.go` — validation, ErrNotFound, duplicate name handling
- [x] `handler/environment.go` — GET/POST/PUT /api/environments, PATCH /api/environments/{id}/active
- [ ] `middleware/ratelimit.go` — rate limiter (deferred — not blocking any slice)

### React (pending — backend-first)
- [ ] `web/src/api/environments.js`
- [ ] `web/src/pages/admin/EnvironmentsPage.jsx`

---

## Phase 9: Slice 4 — Holds (Claim / Extend / Release / Reclaim) ✓ (backend)
> Goal: full hold lifecycle works.

### Backend ✓
- [x] `store/hold.go` — ClaimEnvironment (SELECT FOR UPDATE tx), ExtendHold, ReleaseHold, ReclaimHold
- [x] `store/history.go` — InsertHistory, ListHistory, CountHistory
- [x] `service/hold.go` — claim rules (env active, not taken, max-2), extend rules, release, reclaim (admin only)
- [x] `handler/hold.go` — POST /api/holds, PATCH /api/holds/:id/extend, DELETE /api/holds/:id, POST /api/holds/:id/reclaim
- [x] Wire hold routes in main.go
- [x] `main.go` DSN — fixed timezone: `loc=Local` so Go times match MySQL NOW()

### React (pending — backend-first)
- [ ] `web/src/api/holds.js`
- [ ] `web/src/components/ClaimModal/`
- [ ] `web/src/components/ExtendModal/`
- [ ] `web/src/components/ReclaimModal/`

---

## Phase 10: Slice 5 — History ✓ (backend)
> Goal: per-environment audit log is visible.

### Backend ✓
- [x] `service/history.go` — fetch + paginate (HistoryPage: entries, total, limit, offset)
- [x] `handler/history.go` — GET /api/environments/:id/history (limit/offset query params)
- [x] Wire history route in main.go

### React (pending — backend-first)
- [ ] `web/src/api/history.js`
- [ ] `web/src/pages/HistoryPage.jsx`
- [ ] `web/src/components/HistoryList/`

---

## Phase 11: Slice 6 — Admin (Users + Logs) ✓ (backend)
> Goal: admin can manage users and view audit logs.

### Backend ✓
- [x] `service/admin.go` — create/list/role/active/password + admin action logging
- [x] `handler/admin.go` — GET/POST /api/admin/users, PATCH role/active/password, GET logs/actions
- [x] Wire admin routes in main.go

### React (pending — backend-first)
- [ ] `web/src/pages/admin/UsersPage.jsx`
- [ ] `web/src/pages/admin/LogsPage.jsx`

---

## Phase 12: Integration ← not in scope yet
## Phase 13: Testing ← not in scope yet
## Phase 14: Deployment ← not in scope yet

---

## Key Tricky Parts (reference)

| Concern | Approach |
|---|---|
| Race condition on claim | `SELECT FOR UPDATE` inside a transaction |
| Expiry at read time | `WHERE expires_at > NOW()` — no background job |
| Live updates without a broker | SSE goroutine polls MySQL every 2s |
| Max-2-holds enforcement | Count active holds inside the same TX as the claim |

---

> **Note:** React is intentionally deferred — complete all backend slices first.
