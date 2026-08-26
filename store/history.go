package store

import (
	"database/sql"
	"fmt"

	"envboard/model"
)

func InsertHistory(db *sql.DB, envID, userID int, holdID *int, action string, reason *string) error {
	_, err := db.Exec(
		`INSERT INTO history (environment_id, user_id, hold_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
		envID, userID, holdID, action, reason,
	)
	if err != nil {
		return fmt.Errorf("store.InsertHistory: %w", err)
	}
	return nil
}

func ListHistory(db *sql.DB, envID, limit, offset int) ([]model.History, error) {
	query := `
		SELECT id, environment_id, user_id, hold_id, action, reason, created_at
		FROM history
		WHERE environment_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`

	rows, err := db.Query(query, envID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("store.ListHistory: %w", err)
	}
	defer rows.Close()

	var entries []model.History
	for rows.Next() {
		var h model.History
		err := rows.Scan(
			&h.ID, &h.EnvironmentID, &h.UserID,
			&h.HoldID, &h.Action, &h.Reason, &h.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("store.ListHistory: scan: %w", err)
		}
		entries = append(entries, h)
	}
	return entries, nil
}

func CountHistory(db *sql.DB, envID int) (int, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM history WHERE environment_id = ?`, envID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("store.CountHistory: %w", err)
	}
	return count, nil
}
