package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

const rateLimitPerMinute = 5

var ErrRateLimitExceeded = errors.New("rate limit exceeded: too many requests")

// CheckRateLimit increments the per-user per-action counter for the current
// 1-minute window and returns ErrRateLimitExceeded if the count exceeds the limit.
func CheckRateLimit(db *sql.DB, userID int, action string) error {
	window := time.Now().Truncate(time.Minute)

	_, err := db.Exec(`
		INSERT INTO rate_limits (user_id, action, window_start, count)
		VALUES (?, ?, ?, 1)
		ON DUPLICATE KEY UPDATE count = count + 1`,
		userID, action, window,
	)
	if err != nil {
		return fmt.Errorf("store.CheckRateLimit: %w", err)
	}

	var count int
	err = db.QueryRow(`
		SELECT count FROM rate_limits
		WHERE user_id = ? AND action = ? AND window_start = ?`,
		userID, action, window,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("store.CheckRateLimit: %w", err)
	}

	if count > rateLimitPerMinute {
		return ErrRateLimitExceeded
	}

	// Lazy cleanup: delete windows older than 2 minutes in the background
	go func() {
		db.Exec(`DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 2 MINUTE)`)
	}()

	return nil
}
