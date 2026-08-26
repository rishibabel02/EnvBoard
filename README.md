# EnvBoard

A shared test environment reservation system. Teams claim, extend, and release environments through a live board — no more Slack messages asking "is staging free?"

---

## What it does

- **Live board** — every environment's status (available / in use / unavailable) updates in real time across all open tabs via Server-Sent Events
- **Claim & release** — grab an environment for a set duration, extend it before it expires, or release it early
- **Hold limits** — a user can hold at most 2 environments at a time; simultaneous claims are race-safe via `SELECT FOR UPDATE`
- **Admin controls** — create/edit/toggle environments, force-reclaim any hold with a mandatory reason, manage users
- **Audit trail** — every hold event (claimed, extended, released, expired, reclaimed) is logged per environment; admin actions are separately tracked

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Go (net/http) |
| Database | MySQL 8 |
| Auth | JWT (HS256) + bcrypt |
| Live updates | Server-Sent Events (SSE) |
| Frontend | React |

---

## Project structure

```
envboard/
├── main.go                  # router, middleware wiring, server start
├── schema.sql               # full DB schema — run once to set up
│
├── model/
│   └── model.go             # Go structs shared across all layers
│
├── store/                   # SQL only — no business logic
│   ├── store.go             # DB connection pool
│   ├── user.go
│   ├── environment.go
│   ├── hold.go              # SELECT FOR UPDATE claim transaction
│   ├── history.go
│   └── log.go
│
├── service/                 # Business rules — no HTTP
│   ├── auth.go              # bcrypt verify, JWT sign/parse
│   ├── board.go             # board state assembly
│   ├── environment.go
│   ├── hold.go              # max-2 rule, expiry check, claim workflow
│   ├── history.go
│   ├── admin.go
│   ├── log.go
│   └── errors.go            # sentinel errors
│
├── handler/                 # HTTP only — decode → service → encode
│   ├── auth.go
│   ├── board.go             # SSE stream
│   ├── environment.go
│   ├── hold.go
│   ├── history.go
│   └── admin.go
│
├── middleware/
│   └── auth.go              # JWT validation, context injection, AdminOnly
│
├── cmd/
│   └── seed/main.go         # seed script — creates initial admin user
│
└── docs/
    ├── REQUIREMENTS.md
    ├── ARCHITECTURE.md
    ├── API_CONTRACT.md
    ├── DB_SCHEMA_README.md
    └── CHECKLIST.md
```

---

## Getting started

### Prerequisites

- Go 1.22+
- MySQL 8.0+

### 1. Create the database

Run `schema.sql` in MySQL Workbench or the CLI:

```sql
SOURCE path/to/schema.sql;
```

### 2. Configure the DSN

Edit the DSN in `main.go` to match your MySQL credentials:

```go
dsn := "user:password@tcp(127.0.0.1:3306)/envboard?parseTime=true&loc=Local"
```

> `loc=Local` is required — it aligns Go's time values with MySQL's `NOW()` timezone.

### 3. Seed the admin user

```bash
go run cmd/seed/main.go
```

Creates `admin@test.com` with password `password123`.

### 4. Run the server

```bash
go run main.go
```

Server starts on `:8080`.

---

## API overview

Base URL: `http://localhost:8080/api`

All protected routes require `Authorization: Bearer <token>`.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/board` | any | Board snapshot |
| GET | `/board/stream` | any | SSE live board |
| GET | `/environments` | admin | List all environments |
| POST | `/environments` | admin | Create environment |
| PATCH | `/environments/:id` | admin | Update environment |
| PATCH | `/environments/:id/status` | admin | Toggle active/inactive |
| GET | `/environments/:id/history` | any | Hold history for environment |
| POST | `/holds` | any | Claim an environment |
| PATCH | `/holds/:id/extend` | owner | Add minutes to hold |
| DELETE | `/holds/:id/release` | owner | Release hold early |
| POST | `/holds/:id/reclaim` | admin | Force-reclaim any hold |
| GET | `/admin/users` | admin | List users |
| POST | `/admin/users` | admin | Create user |
| PATCH | `/admin/users/:id/role` | admin | Change role |
| PATCH | `/admin/users/:id/status` | admin | Activate / deactivate |
| POST | `/admin/users/:id/reset-password` | admin | Reset password |
| GET | `/admin/logs` | admin | Login/event log |
| GET | `/admin/actions` | admin | Admin action audit log |

Full request/response shapes: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)

---

## Architecture

```
handler  →  service  →  store  →  MySQL
```

- **handler** — HTTP only: decode request, call service, write response
- **service** — business rules: ownership checks, hold limits, expiry validation
- **store** — SQL only: no logic, returns typed structs
- **middleware** — JWT validation, role enforcement, context injection

Live board works without a message broker: each SSE connection runs a goroutine that polls MySQL every 2 seconds. The Go service is stateless — any pod can serve any request.

Full details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Key design decisions

| Concern | Approach |
|---|---|
| Race-safe claim | `SELECT FOR UPDATE` inside a transaction — MySQL serializes concurrent claims |
| Expiry | `WHERE expires_at > NOW()` at read time — no background job |
| Live updates | SSE + MySQL polling — no broker needed in v1 |
| Auth | Stateless JWT — works across multiple pods |

---

## Status

| Layer | Status |
|---|---|
| Database schema | Done |
| Go backend (all slices) | Done |
| React frontend | Not started |

Backend is fully functional and testable via Postman or curl. See [`docs/CHECKLIST.md`](docs/CHECKLIST.md) for detailed progress.

---

## Development notes

- All passwords stored as bcrypt hashes (`golang.org/x/crypto/bcrypt`)
- JWT secret is hardcoded in `service/auth.go` — move to an environment variable before deploying
- Rate limiting (`middleware/ratelimit.go`) is stubbed — implement before production use
