# EnvBoard — Database Schema Reference

## Overview

6 tables. MySQL is the single source of truth — no cache, no broker in v1.

```
users
environments
holds          → references users, environments
history        → references users, environments, holds
logs           → references users (nullable)
admin_actions  → references users
```

## Migration Convention

`schema.sql` is the base — run it once to create the full database.
`migrations/` holds future changes (ALTER TABLE, new columns, etc.) numbered sequentially:

```
migrations/
    001_add_column_x.sql
    002_rename_table_y.sql
```

Never edit `schema.sql` after the DB is live. All changes go through migrations.

---

## Table: `users`

### Purpose
Everyone who can log in. Admin creates all accounts — no self-service signup.
Admins can deactivate users without deleting them, preserving all history links.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| name | VARCHAR(100) | NO | — |
| email | VARCHAR(255) | NO | — |
| password_hash | VARCHAR(255) | NO | — |
| role | ENUM('member','admin') | NO | 'member' |
| is_active | TINYINT(1) | NO | 1 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### Why these types?
- **INT AUTO_INCREMENT** — simple sequential PK; no UUID needed for an internal tool
- **VARCHAR(100)** for name — names never approach 100 chars; VARCHAR stores only what's used
- **VARCHAR(255)** for email — RFC 5321 max email length is 254 chars; 255 is the universal safe choice
- **VARCHAR(255)** for password_hash — bcrypt output is 60 chars today, but 255 leaves room if the algorithm ever changes
- **ENUM('member','admin')** — only two valid values; MySQL enforces this at the DB level, no invalid strings possible
- **TINYINT(1)** for is_active — MySQL's boolean; 1 byte; 1 = true, 0 = false
- **DATETIME** over TIMESTAMP — avoids the 2038 overflow problem; doesn't auto-convert to UTC (app controls timezone)
- **updated_at ON UPDATE CURRENT_TIMESTAMP** — MySQL updates this column automatically on every row change; no app code needed

### Primary Key
`id` — auto-incrementing integer.

### Constraints
- `email` is UNIQUE — one account per email address; also the login identifier

### Indexes
- `uq_users_email` — unique index on email; used on every login query

### Relationships
- Referenced by `holds.user_id`
- Referenced by `history.user_id`
- Referenced by `logs.user_id` (nullable)
- Referenced by `admin_actions.admin_id`

---

## Table: `environments`

### Purpose
The test environments admins create and manage. The board shows all of these.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| name | VARCHAR(100) | NO | — |
| description | TEXT | YES | NULL |
| console_url | VARCHAR(500) | YES | NULL |
| is_active | TINYINT(1) | NO | 1 |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |
| updated_at | DATETIME | NO | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

### Why these types?
- **VARCHAR(100)** for name — short display label; UNIQUE enforced; VARCHAR is efficient for short strings
- **TEXT** for description — no meaningful length cap; TEXT handles up to 65,535 chars without waste
- **VARCHAR(500)** for console_url — URLs can be long but still bounded; TEXT would be overkill
- **TINYINT(1)** for is_active — same as users; admin toggles this to remove an env from the board

### Primary Key
`id`

### Constraints
- `name` is UNIQUE — two environments can't have the same display name on the board

### Indexes
- `uq_environments_name` — unique index on name

### Relationships
- Referenced by `holds.environment_id`
- Referenced by `history.environment_id`
- Referenced by `admin_actions.target_id` (when target_type = 'environment')

### Status logic (computed at read time, not stored)
```
is_active = 0                          → unavailable
is_active = 1, no active hold         → available
is_active = 1, active hold exists     → in use
```

---

## Table: `holds`

### Purpose
Every reservation ever made. One row per claim. Status reflects what happened to it.
Expiry is **never** enforced by a background job — the app checks `expires_at > NOW()` on every read.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| environment_id | INT | NO | — |
| user_id | INT | NO | — |
| purpose | TEXT | NO | — |
| started_at | DATETIME | NO | CURRENT_TIMESTAMP |
| expires_at | DATETIME | NO | — |
| released_at | DATETIME | YES | NULL |
| status | ENUM('active','released','expired','reclaimed') | NO | 'active' |

### Why these types?
- **TEXT** for purpose — user-typed reason; no length restriction makes sense here
- **DATETIME** for expires_at — compared directly with `NOW()` in SQL; DATETIME is ideal for this
- **DATETIME NULL** for released_at — only populated when a hold ends early (release or reclaim); NULL means it expired or is still active
- **ENUM** for status — 4 valid terminal states; DB enforces no other value is possible

### Primary Key
`id`

### Foreign Keys
- `environment_id` → `environments(id)`
- `user_id` → `users(id)`

### Constraints
- One active hold per environment — enforced in application logic via `SELECT FOR UPDATE` (not a DB constraint, because MySQL doesn't support partial unique indexes)

### Indexes
- `idx_holds_env_status (environment_id, status)` — query: "does environment #3 have an active hold?"
- `idx_holds_user_status (user_id, status)` — query: "how many active holds does user #5 have?" (enforces max-2 rule)

### Relationships
- Belongs to one `environments` row
- Belongs to one `users` row
- Referenced by `history.hold_id`

### Key design decision
The `status` column is informational. The authoritative check is always:
```sql
status = 'active' AND expires_at > NOW()
```
When the app first sees an expired hold, it updates status to 'expired' and writes to history in the same transaction.

---

## Table: `history`

### Purpose
Append-only audit log of every hold event. Never updated, never deleted.
Answers: "what happened to environment X, and when?"

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| environment_id | INT | NO | — |
| user_id | INT | NO | — |
| hold_id | INT | YES | NULL |
| action | ENUM('claimed','extended','released','expired','reclaimed') | NO | — |
| reason | TEXT | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |

### Why these types?
- **ENUM** for action — exactly 5 valid event types; DB prevents anything else
- **TEXT NULL** for reason — only populated for `reclaimed` (mandatory); NULL for all others
- **INT NULL** for hold_id — nullable to allow future system-level events not tied to a specific hold

### Primary Key
`id`

### Foreign Keys
- `environment_id` → `environments(id)`
- `user_id` → `users(id)`
- `hold_id` → `holds(id)` (nullable)

### Indexes
- `idx_history_environment (environment_id)` — query: "show all events for environment #3"

### Relationships
- Belongs to one `environments` row
- Belongs to one `users` row (who performed the action)
- Optionally belongs to one `holds` row

### When a row is written

| action | trigger | reason populated? |
|---|---|---|
| claimed | successful claim | No |
| extended | user adds time | No |
| released | user releases early | No |
| expired | expired hold first observed at read time | No |
| reclaimed | admin force-reclaims | Yes — mandatory |

---

## Table: `logs`

### Purpose
System-level event log. Captures login attempts, auth failures, and rate limit hits.
Separate from `history` (hold events) and `admin_actions` (management operations).

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| user_id | INT | YES | NULL |
| event | VARCHAR(100) | NO | — |
| ip_address | VARCHAR(45) | YES | NULL |
| user_agent | TEXT | YES | NULL |
| details | TEXT | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |

### Why these types?
- **INT NULL** for user_id — nullable because a failed login has no authenticated user yet
- **VARCHAR(100)** for event — short machine-readable code (e.g. `login_success`); VARCHAR not ENUM because event types may expand without a migration
- **VARCHAR(45)** for ip_address — IPv6 max length is 39 chars; 45 gives safe padding
- **TEXT** for user_agent — browser user-agent strings can be 200+ chars; TEXT handles this cleanly
- **TEXT NULL** for details — optional extra context; nullable to avoid forcing empty strings

### Primary Key
`id`

### Foreign Keys
- `user_id` → `users(id)` (nullable)

### Indexes
- `idx_logs_user (user_id)` — query: "all log entries for user #5"
- `idx_logs_created_at (created_at)` — query: "all failed logins in the last 24 hours"

### Events written to this table

| event | user_id? | when |
|---|---|---|
| login_success | Yes | Successful login |
| login_failed | No | Wrong email or password |
| rate_limit_hit | Yes | User exceeds write action limit |

---

## Table: `admin_actions`

### Purpose
Tracks every management action an admin performs on users or environments.
Answers: "what has admin Y done across the whole system?"
Separate from `history` (hold events) and `logs` (system/auth events).

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | INT AUTO_INCREMENT | NO | — |
| admin_id | INT | NO | — |
| action | VARCHAR(100) | NO | — |
| target_type | VARCHAR(50) | YES | NULL |
| target_id | INT | YES | NULL |
| details | TEXT | YES | NULL |
| created_at | DATETIME | NO | CURRENT_TIMESTAMP |

### Why these types?
- **VARCHAR(100)** for action — not ENUM; admin action types will grow over time (e.g. password reset, bulk deactivate); VARCHAR avoids a migration every time a new action is added
- **VARCHAR(50)** for target_type — `'user'` or `'environment'` today; VARCHAR keeps it open for expansion
- **INT NULL** for target_id — nullable for potential future system-level actions with no specific target
- **TEXT NULL** for details — human-readable summary of what changed; nullable for actions where the action name is self-explanatory

### Primary Key
`id`

### Foreign Keys
- `admin_id` → `users(id)`

### Indexes
- `idx_admin_actions_admin (admin_id)` — query: "everything admin #2 has ever done"

### Actions written to this table

| action | target_type | example details |
|---|---|---|
| create_user | user | "Created john@acme.com as member" |
| update_role | user | "Role changed: member → admin" |
| deactivate_user | user | "Account deactivated" |
| reactivate_user | user | "Account reactivated" |
| reset_password | user | "Password reset by admin" |
| create_environment | environment | "Created staging-01" |
| edit_environment | environment | "Updated console_url" |
| toggle_environment | environment | "Set inactive" |
| reclaim_hold | environment | "Reclaimed hold #12 from john@acme.com. Reason: urgent prod debug" |

### Note on reclaim_hold
A force-reclaim writes to **both** `admin_actions` and `history`:
- `history` → per-environment audit trail (visible to all users)
- `admin_actions` → admin activity log (what this admin has done system-wide)
