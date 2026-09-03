# EnvBoard

A shared test environment reservation system. Teams claim, extend, and release environments through a live board — no more Slack messages asking *"is staging free?"*

---

## Features

| | |
|---|---|
| **Live board** | Environment status updates in real time across all tabs via SSE |
| **Claim & release** | Grab an environment for a set duration, extend before expiry, or release early |
| **Hold limits** | Max 2 active holds per user; concurrent claims are race-safe at the DB level |
| **Admin controls** | Manage environments and users, force-reclaim holds, view audit logs |
| **Notifications** | Users get notified when their hold is force-released or expires in 5 minutes |

---

## Tech stack

| Layer | |
|---|---|
| Backend | Go 1.22+ · `net/http` |
| Database | MySQL 8.0 |
| Auth | JWT (HS256) + bcrypt |
| Frontend | React 18 · Vite · Tailwind CSS v4 · React Router v6 |

---

## Database tables

| Table | Purpose |
|---|---|
| `users` | All accounts (admin-created, no self-signup) |
| `environments` | The test environments shown on the board |
| `holds` | One row per reservation — tracks full claim lifecycle |
| `history` | Append-only event log per environment (claimed, extended, released, expired, reclaimed) |
| `logs` | System events: logins and auth failures |
| `admin_actions` | Every management action an admin performs |
| `rate_limits` | Per-user action throttle counters |

---

## Setup

### Prerequisites

- Go 1.22+
- Node.js 18+ and npm
- MySQL 8.0+

---

### 1. Clone and configure environment

Create a `.env` file in the project root (it is gitignored and never committed):

```env
JWT_SECRET=any-long-random-string-here
DB_DSN=root:password@tcp(127.0.0.1:3306)/envboard?parseTime=true&loc=Local
```

- **`JWT_SECRET`** — used to sign and verify JWTs. Use a long random string in production.
- **`DB_DSN`** — MySQL connection string. `loc=Local` is required so Go's `time.Now()` and MySQL's `NOW()` stay in sync; expiry comparisons will break without it.

---

### 2. Create the database

```bash
mysql -u root -p < schema.sql
```

---

### 3. Seed the first admin user

```bash
go run cmd/seed/main.go
```

Creates `admin@test.com` / `password123`.

---

### 4. Start the backend

```bash
go run main.go
```

API available at `http://localhost:8080`.

---

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:5173`. Vite proxies all `/api` requests to `:8080`.

---

## User roles

| Role | Can do |
|---|---|
| **Member** | View board, claim / extend / release their own holds, view history |
| **Admin** | Everything above + manage environments and users, force-reclaim any hold, view logs |

---

## API overview

Base URL: `http://localhost:8080/api` — protected routes require `Authorization: Bearer <token>`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/board/stream` | member | SSE live board (`?token=` supported) |
| GET | `/environments/:id/history` | member | Hold history for one environment |
| POST | `/holds` | member | Claim an environment |
| PATCH | `/holds/:id/extend` | owner | Extend a hold |
| DELETE | `/holds/:id/release` | owner | Release a hold early |
| POST | `/holds/:id/reclaim` | admin | Force-reclaim any hold |
| GET | `/environments` | admin | List environments |
| POST | `/environments` | admin | Create environment |
| PATCH | `/environments/:id` | admin | Update environment |
| PATCH | `/environments/:id/status` | admin | Toggle active/inactive |
| DELETE | `/environments/:id` | admin | Delete environment |
| GET | `/admin/users` | admin | List users |
| POST | `/admin/users` | admin | Create user |
| PATCH | `/admin/users/:id/role` | admin | Change role |
| PATCH | `/admin/users/:id/status` | admin | Activate / deactivate |
| POST | `/admin/users/:id/reset-password` | admin | Reset password |
| GET | `/admin/logs` | admin | System log |
| GET | `/admin/actions` | admin | Admin action log |
| GET | `/admin/audit` | admin | Hold event log |
