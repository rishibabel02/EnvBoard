package model

import "time"

type User struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Environment struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ConsoleURL  string    `json:"console_url"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Hold struct {
	ID            int        `json:"id"`
	EnvironmentID int        `json:"environment_id"`
	UserID        int        `json:"user_id"`
	Purpose       string     `json:"purpose"`
	StartedAt     time.Time  `json:"started_at"`
	ExpiresAt     time.Time  `json:"expires_at"`
	ReleasedAt    *time.Time `json:"released_at"`
	Status        string     `json:"status"`
}

type History struct {
	ID            int       `json:"id"`
	EnvironmentID int       `json:"environment_id"`
	UserID        int       `json:"user_id"`
	HoldID        *int      `json:"hold_id"`
	Action        string    `json:"action"`
	Reason        *string   `json:"reason"`
	CreatedAt     time.Time `json:"created_at"`
}

type Log struct {
	ID        int       `json:"id"`
	UserID    *int      `json:"user_id"`
	Event     string    `json:"event"`
	IPAddress *string   `json:"ip_address"`
	UserAgent *string   `json:"user_agent"`
	Details   *string   `json:"details"`
	CreatedAt time.Time `json:"created_at"`
}

type HolderInfo struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type BoardHoldInfo struct {
	ID               int        `json:"id"`
	Holder           HolderInfo `json:"holder"`
	Purpose          string     `json:"purpose"`
	StartedAt        time.Time  `json:"started_at"`
	ExpiresAt        time.Time  `json:"expires_at"`
	SecondsRemaining int64      `json:"seconds_remaining"`
}

type BoardEntry struct {
	ID          int            `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	ConsoleURL  string         `json:"console_url"`
	Status      string         `json:"status"`
	Hold        *BoardHoldInfo `json:"hold"`
}

type AdminAction struct {
	ID         int       `json:"id"`
	AdminID    int       `json:"admin_id"`
	Action     string    `json:"action"`
	TargetType *string   `json:"target_type"`
	TargetID   *int      `json:"target_id"`
	Details    *string   `json:"details"`
	CreatedAt  time.Time `json:"created_at"`
}
