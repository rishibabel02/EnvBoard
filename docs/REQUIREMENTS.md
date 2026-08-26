# EnvBoard — Requirements

## Functional Requirements
> What the system must DO.

### FR-1: Environment Management (Admin)
- FR-1.1 Admin can create an environment (name, description, console URL)
- FR-1.2 Admin can edit environment details
- FR-1.3 Admin can mark an environment active or inactive
- FR-1.4 Admin can view which environments are held and by whom
- FR-1.5 Admin can force-reclaim any active hold with a mandatory reason

### FR-2: Hold / Reservation (Member + Admin)
- FR-2.1 User can claim an environment by providing purpose and duration (minutes)
- FR-2.2 User can extend their hold by adding more minutes (must be before expiry)
- FR-2.3 User can release their hold early
- FR-2.4 If an environment is taken, the system shows the holder's name
- FR-2.5 A user may hold at most 2 environments at a time

### FR-3: Live Board (Anyone logged in)
- FR-3.1 Every environment is visible with status: available, in use, or unavailable
- FR-3.2 In-use environments show: holder name, purpose, time remaining
- FR-3.3 Board updates across all open tabs within seconds — no manual refresh

### FR-4: Auto-Expiry
- FR-4.1 A hold ends automatically when its time runs out
- FR-4.2 The environment shows as available immediately on expiry
- FR-4.3 No grace period. No auto-renewal. User must extend before expiry.

### FR-5: History & Audit Trail (Anyone logged in)
- FR-5.1 Every environment has a log of events: claimed, extended, released, expired, reclaimed
- FR-5.2 Each log entry shows who, what, when, and why (where applicable)
- FR-5.3 History is append-only — no entry can be edited or deleted

### FR-6: Auth & User Management
- FR-6.1 No self-service signup — admin creates all user accounts
- FR-6.2 Every action is tied to an identified user
- FR-6.3 Two roles: member (claim/extend/release own holds) and admin (all of the above + reclaim + manage environments + manage users)
- FR-6.4 Admin can create users, change roles, deactivate/reactivate accounts

---

## Non-Functional Requirements
> How the system must BEHAVE.

### NFR-1: Stack
- NFR-1.1 Backend: Go service
- NFR-1.2 Frontend: React
- NFR-1.3 Database: MySQL — single source of truth
- NFR-1.4 No separate cache, message broker, or background job runner in v1

### NFR-2: Correctness & Consistency
- NFR-2.1 Simultaneous claims on the same environment must resolve to exactly one winner (MySQL SELECT FOR UPDATE)
- NFR-2.2 Expiry must be evaluated at read time using `expires_at vs NOW()` — not by a background job flipping a status column
- NFR-2.3 Admin-only actions must be enforced server-side, not just hidden in the UI

### NFR-3: Scalability
- NFR-3.1 The Go service must be stateless — no pod-local session or hold state
- NFR-3.2 Any instance can serve any request
- NFR-3.3 Live board powered by MySQL polling (SSE goroutine per connection, polling every 1–2s)

### NFR-4: Security
- NFR-4.1 Passwords stored as bcrypt hashes — never plain text
- NFR-4.2 Auth via JWT — stateless, works across pods
- NFR-4.3 Per-user rate limiting on write actions (claim/extend/release): 20 requests/minute
- NFR-4.4 All login attempts and rate limit hits logged to the `logs` table

### NFR-5: Data Integrity
- NFR-5.1 History table is append-only at the application level — no UPDATE or DELETE paths exist
- NFR-5.2 Admin actions logged to `admin_actions` table for full auditability
