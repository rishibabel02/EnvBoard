# EnvBoard — API Contract

## Conventions

- Base URL: `/api`
- All request/response bodies: `application/json`
- Auth: `Authorization: Bearer <jwt_token>` header on every protected route
- Dates: ISO 8601 strings — `"2026-08-24T10:30:00Z"`

---

## Standard Response Shape

**Success:**
```json
{ "data": { ... } }
{ "data": [ ... ] }
```

**Success with no body:** `204 No Content`

**Error:**
```json
{
  "error": {
    "code": "SNAKE_CASE_CODE",
    "message": "Human readable explanation"
  }
}
```

---

## Error Codes

| Code | HTTP | When |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Missing or invalid request field |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `ENV_INACTIVE` | 409 | Environment is marked inactive |
| `ENV_TAKEN` | 409 | Environment already has an active hold |
| `HOLD_LIMIT_EXCEEDED` | 409 | User already has 2 active holds |
| `HOLD_NOT_OWNED` | 403 | Trying to extend/release someone else's hold |
| `HOLD_EXPIRED` | 409 | Hold has already expired — cannot extend |
| `HOLD_NOT_ACTIVE` | 409 | Hold is not in active state |
| `RATE_LIMITED` | 429 | Too many write actions (20/min per user) |

---

## Auth

### POST /api/auth/login
Login with email and password. Returns a JWT.

**Auth required:** No

**Request:**
```json
{
  "email": "john@acme.com",
  "password": "secret"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "name": "John",
      "email": "john@acme.com",
      "role": "member"
    }
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` — wrong email or password
- `401 UNAUTHORIZED` — account is deactivated
- `422 VALIDATION_ERROR` — missing email or password

---

## Board

### GET /api/board
Get the current state of all environments. This is what the board page loads.

**Auth required:** Yes (any role)

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "name": "staging-01",
      "description": "Main staging environment",
      "console_url": "https://console.staging-01.acme.com",
      "status": "in_use",
      "hold": {
        "id": 12,
        "holder": { "id": 3, "name": "Jane" },
        "purpose": "Testing auth flow",
        "started_at": "2026-08-24T09:00:00Z",
        "expires_at": "2026-08-24T11:00:00Z",
        "seconds_remaining": 4320
      }
    },
    {
      "id": 2,
      "name": "staging-02",
      "status": "available",
      "hold": null
    },
    {
      "id": 3,
      "name": "staging-03",
      "status": "unavailable",
      "hold": null
    }
  ]
}
```

**Status values:** `available` | `in_use` | `unavailable`

---

### GET /api/board/stream
SSE stream. Pushes board state whenever anything changes.

**Auth required:** Yes (any role)

**Response:** `text/event-stream`
```
data: { "type": "board_update", "data": [ ...same shape as GET /api/board... ] }

: keepalive
```

Client reconnects automatically on disconnect.

---

## Environments

### GET /api/environments
List all environments (admin view — includes inactive ones).

**Auth required:** Yes — admin only

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "name": "staging-01",
      "description": "Main staging environment",
      "console_url": "https://console.staging-01.acme.com",
      "is_active": true,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-08-20T14:00:00Z"
    }
  ]
}
```

---

### POST /api/environments
Create a new environment.

**Auth required:** Yes — admin only

**Request:**
```json
{
  "name": "staging-04",
  "description": "New environment for load tests",
  "console_url": "https://console.staging-04.acme.com"
}
```

**Response: 201 Created**
```json
{
  "data": {
    "id": 4,
    "name": "staging-04",
    "description": "New environment for load tests",
    "console_url": "https://console.staging-04.acme.com",
    "is_active": true,
    "created_at": "2026-08-24T10:00:00Z"
  }
}
```

**Errors:**
- `409 EMAIL_TAKEN` → use `ENV_NAME_TAKEN` — name already exists
- `422 VALIDATION_ERROR` — name is missing

---

### PATCH /api/environments/:id
Edit an environment's details. Send only the fields you want to change — blank name falls back to the current value.

**Auth required:** Yes — admin only

**Request:** (all fields optional — send only what changed)
```json
{
  "name": "staging-04-updated",
  "description": "Updated description",
  "console_url": "https://new-url.acme.com"
}
```

**Response: 200 OK**
```json
{ "data": { ...updated environment object... } }
```

**Errors:**
- `404 NOT_FOUND`
- `422 VALIDATION_ERROR`

---

### PATCH /api/environments/:id/status
Toggle an environment active or inactive.
Toggle an environment active or inactive.

**Auth required:** Yes — admin only

**Request:**
```json
{ "is_active": false }
```

**Response: 200 OK**
```json
{ "data": { ...updated environment object... } }
```

**Errors:**
- `404 NOT_FOUND`
- `422 VALIDATION_ERROR` — is_active missing

---

## Holds

### POST /api/holds
Claim an environment.

**Auth required:** Yes (any role)

**Request:**
```json
{
  "environment_id": 1,
  "purpose": "Testing the new auth flow for ticket ENV-42",
  "duration_minutes": 60
}
```

**Response: 201 Created**
```json
{
  "data": {
    "id": 15,
    "environment": { "id": 1, "name": "staging-01" },
    "holder": { "id": 3, "name": "Jane" },
    "purpose": "Testing the new auth flow for ticket ENV-42",
    "started_at": "2026-08-24T10:00:00Z",
    "expires_at": "2026-08-24T11:00:00Z",
    "seconds_remaining": 3600,
    "status": "active"
  }
}
```

**Errors:**
- `404 NOT_FOUND` — environment doesn't exist
- `409 ENV_INACTIVE` — environment is not active
- `409 ENV_TAKEN` — already held; message includes holder name: `"Held by Jane"`
- `409 HOLD_LIMIT_EXCEEDED` — user already has 2 active holds
- `422 VALIDATION_ERROR` — missing field or duration_minutes < 1 or > 480
- `429 RATE_LIMITED`

---

### PATCH /api/holds/:id/extend
Add minutes to an active hold. Must be called before expiry.

**Auth required:** Yes — hold owner only

**Request:**
```json
{ "add_minutes": 30 }
```

**Response: 200 OK**
```json
{
  "data": {
    "id": 15,
    "expires_at": "2026-08-24T11:30:00Z",
    "seconds_remaining": 5400,
    "status": "active"
  }
}
```

**Errors:**
- `404 NOT_FOUND`
- `403 HOLD_NOT_OWNED` — not the holder
- `409 HOLD_EXPIRED` — hold already expired, cannot extend
- `409 HOLD_NOT_ACTIVE` — hold is released or reclaimed
- `422 VALIDATION_ERROR` — add_minutes < 1 or > 60
- `429 RATE_LIMITED`

---

### DELETE /api/holds/:id/release  
Release your own hold early.

**Auth required:** Yes — hold owner only

**Response: 204 No Content**

**Errors:**
- `404 NOT_FOUND`
- `403 HOLD_NOT_OWNED`
- `409 HOLD_NOT_ACTIVE` — already expired/released/reclaimed
- `429 RATE_LIMITED`

---

### POST /api/holds/:id/reclaim
Admin force-reclaims someone else's hold. Reason is mandatory.

**Auth required:** Yes — admin only

**Request:**
```json
{ "reason": "Needed urgently for prod incident debugging" }
```

**Response: 200 OK**
```json
{
  "data": {
    "id": 15,
    "status": "reclaimed",
    "reclaimed_at": "2026-08-24T10:45:00Z",
    "reason": "Needed urgently for prod incident debugging"
  }
}
```

**Errors:**
- `404 NOT_FOUND`
- `403 FORBIDDEN` — not admin
- `409 HOLD_NOT_ACTIVE`
- `422 VALIDATION_ERROR` — reason is missing or empty

---

## History

### GET /api/environments/:id/history
Full audit log for one environment. Append-only — nothing is hidden.

**Auth required:** Yes (any role)

**Query params:**
- `limit` — default 50, max 200
- `offset` — for pagination, default 0

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 101,
      "action": "claimed",
      "user": { "id": 3, "name": "Jane" },
      "hold_id": 15,
      "reason": null,
      "created_at": "2026-08-24T10:00:00Z"
    },
    {
      "id": 102,
      "action": "extended",
      "user": { "id": 3, "name": "Jane" },
      "hold_id": 15,
      "reason": null,
      "created_at": "2026-08-24T10:50:00Z"
    },
    {
      "id": 103,
      "action": "reclaimed",
      "user": { "id": 1, "name": "Admin" },
      "hold_id": 15,
      "reason": "Needed urgently for prod incident debugging",
      "created_at": "2026-08-24T10:45:00Z"
    }
  ],
  "meta": {
    "total": 103,
    "limit": 50,
    "offset": 0
  }
}
```

**Errors:**
- `404 NOT_FOUND` — environment doesn't exist

---

## Admin — User Management

### GET /api/admin/users
List all users.

**Auth required:** Yes — admin only

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John",
      "email": "john@acme.com",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-01-10T08:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/users
Create a new user. No self-service signup — only admins can do this.

**Auth required:** Yes — admin only

**Request:**
```json
{
  "name": "Jane",
  "email": "jane@acme.com",
  "password": "temporary123",
  "role": "member"
}
```

**Response: 201 Created**
```json
{
  "data": {
    "id": 5,
    "name": "Jane",
    "email": "jane@acme.com",
    "role": "member",
    "is_active": true,
    "created_at": "2026-08-24T10:00:00Z"
  }
}
```

**Errors:**
- `409 EMAIL_TAKEN`
- `422 VALIDATION_ERROR` — missing fields or invalid role value

---

### PATCH /api/admin/users/:id/role
Change a user's role.

**Auth required:** Yes — admin only

**Request:**
```json
{ "role": "admin" }
```

**Response: 200 OK**
```json
{ "data": { ...updated user object... } }
```

**Errors:**
- `404 NOT_FOUND`
- `422 VALIDATION_ERROR` — role must be `member` or `admin`

---

### PATCH /api/admin/users/:id/status  
Activate or deactivate a user account.

**Auth required:** Yes — admin only

**Request:**
```json
{ "is_active": false }
```

**Response: 200 OK**
```json
{ "data": { ...updated user object... } }
```

**Errors:**
- `404 NOT_FOUND`
- `422 VALIDATION_ERROR`

---

### POST /api/admin/users/:id/reset-password
Reset a user's password.

**Auth required:** Yes — admin only

**Request:**
```json
{ "new_password": "newpass456" }
```

**Response: 200 OK**
```json
{ "message": "password updated" }
```

**Errors:**
- `404 NOT_FOUND`
- `422 VALIDATION_ERROR` — password too short (min 8 chars)

---

## Admin — Audit

### GET /api/admin/actions
List all admin management actions across the system.

**Auth required:** Yes — admin only

**Query params:** `limit` (default 50), `offset` (default 0)

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 8,
      "admin": { "id": 1, "name": "John" },
      "action": "update_role",
      "target_type": "user",
      "target_id": 5,
      "details": "Role changed: member → admin",
      "created_at": "2026-08-24T09:30:00Z"
    }
  ],
  "meta": { "total": 8, "limit": 50, "offset": 0 }
}
```

---

### GET /api/admin/logs
System event log — logins, failures, rate limit hits.

**Auth required:** Yes — admin only

**Query params:** `limit` (default 50), `offset` (default 0)

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": 201,
      "user": { "id": 3, "name": "Jane" },
      "event": "login_success",
      "ip_address": "192.168.1.10",
      "created_at": "2026-08-24T09:00:00Z"
    },
    {
      "id": 202,
      "user": null,
      "event": "login_failed",
      "ip_address": "10.0.0.5",
      "details": "Unknown email: attacker@evil.com",
      "created_at": "2026-08-24T09:01:00Z"
    }
  ],
  "meta": { "total": 202, "limit": 50, "offset": 0 }
}
```



