package store

import (
	"database/sql"
	"fmt"
	"time"

	"envboard/model"
)

type ActiveHold struct {
	HoldID        int
	EnvironmentID int
	UserID        int
	HolderName    string
	Purpose       string
	StartedAt     time.Time
	ExpiresAt     time.Time
}

func GetActiveHoldsForBoard(db *sql.DB) (map[int]ActiveHold, error) {
	query := `
		SELECT h.id, h.environment_id, h.user_id, u.name, h.purpose, h.started_at, h.expires_at
		FROM holds h
		JOIN users u ON u.id = h.user_id
		WHERE h.status = 'active' AND h.expires_at > NOW()`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("store.GetActiveHoldsForBoard: %w", err)
	}
	defer rows.Close()

	result := make(map[int]ActiveHold)
	for rows.Next() {
		var ah ActiveHold
		err := rows.Scan(&ah.HoldID, &ah.EnvironmentID, &ah.UserID, &ah.HolderName, &ah.Purpose, &ah.StartedAt, &ah.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("store.GetActiveHoldsForBoard: scan: %w", err)
		}
		result[ah.EnvironmentID] = ah
	}
	return result, nil
}

func GetHoldByID(db *sql.DB, id int) (*model.Hold, error) {
	h := &model.Hold{}
	query := `
		SELECT id, environment_id, user_id, purpose, started_at, expires_at, released_at, status
		FROM holds WHERE id = ?`

	err := db.QueryRow(query, id).Scan(
		&h.ID, &h.EnvironmentID, &h.UserID, &h.Purpose,
		&h.StartedAt, &h.ExpiresAt, &h.ReleasedAt, &h.Status,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store.GetHoldByID: %w", err)
	}
	return h, nil
}

func CountActiveHoldsForUser(db *sql.DB, userID int) (int, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM holds WHERE user_id = ? AND status = 'active' AND expires_at > NOW()`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("store.CountActiveHoldsForUser: %w", err)
	}
	return count, nil
}

func ClaimEnvironment(db *sql.DB, envID, userID int, purpose string, durationMinutes int) (*model.Hold, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("store.ClaimEnvironment: begin: %w", err)
	}
	defer tx.Rollback()

	var existingHoldID int
	err = tx.QueryRow(
		`SELECT id FROM holds WHERE environment_id = ? AND status = 'active' AND expires_at > NOW() FOR UPDATE`,
		envID,
	).Scan(&existingHoldID)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("store.ClaimEnvironment: lock check: %w", err)
	}
	if err == nil {
		return nil, ErrEnvTaken
	}

	var userHoldCount int
	if err := tx.QueryRow(
		`SELECT COUNT(*) FROM holds WHERE user_id = ? AND status = 'active' AND expires_at > NOW()`,
		userID,
	).Scan(&userHoldCount); err != nil {
		return nil, fmt.Errorf("store.ClaimEnvironment: count check: %w", err)
	}
	if userHoldCount >= 2 {
		return nil, ErrHoldLimitExceeded
	}

	expiresAt := time.Now().Add(time.Duration(durationMinutes) * time.Minute)
	result, err := tx.Exec(
		`INSERT INTO holds (environment_id, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)`,
		envID, userID, purpose, expiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("store.ClaimEnvironment: insert hold: %w", err)
	}

	holdID, _ := result.LastInsertId()

	_, err = tx.Exec(
		`INSERT INTO history (environment_id, user_id, hold_id, action) VALUES (?, ?, ?, 'claimed')`,
		envID, userID, holdID,
	)
	if err != nil {
		return nil, fmt.Errorf("store.ClaimEnvironment: insert history: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("store.ClaimEnvironment: commit: %w", err)
	}

	return GetHoldByID(db, int(holdID))
}

func ExtendHold(db *sql.DB, holdID, addMinutes int) (*model.Hold, error) {
	_, err := db.Exec(
		`UPDATE holds SET expires_at = DATE_ADD(expires_at, INTERVAL ? MINUTE) WHERE id = ?`,
		addMinutes, holdID,
	)
	if err != nil {
		return nil, fmt.Errorf("store.ExtendHold: %w", err)
	}
	return GetHoldByID(db, holdID)
}

func ReleaseHold(db *sql.DB, holdID, userID int) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("store.ReleaseHold: begin: %w", err)
	}
	defer tx.Rollback()

	now := time.Now()
	_, err = tx.Exec(
		`UPDATE holds SET status = 'released', released_at = ? WHERE id = ?`,
		now, holdID,
	)
	if err != nil {
		return fmt.Errorf("store.ReleaseHold: update: %w", err)
	}

	h, err := GetHoldByID(db, holdID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		`INSERT INTO history (environment_id, user_id, hold_id, action) VALUES (?, ?, ?, 'released')`,
		h.EnvironmentID, userID, holdID,
	)
	if err != nil {
		return fmt.Errorf("store.ReleaseHold: history: %w", err)
	}

	return tx.Commit()
}

func ReclaimHold(db *sql.DB, holdID, adminID int, reason string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("store.ReclaimHold: begin: %w", err)
	}
	defer tx.Rollback()

	now := time.Now()
	_, err = tx.Exec(
		`UPDATE holds SET status = 'reclaimed', released_at = ? WHERE id = ?`,
		now, holdID,
	)
	if err != nil {
		return fmt.Errorf("store.ReclaimHold: update: %w", err)
	}

	h, err := GetHoldByID(db, holdID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		`INSERT INTO history (environment_id, user_id, hold_id, action, reason) VALUES (?, ?, ?, 'reclaimed', ?)`,
		h.EnvironmentID, adminID, holdID, reason,
	)
	if err != nil {
		return fmt.Errorf("store.ReclaimHold: history: %w", err)
	}

	return tx.Commit()
}
