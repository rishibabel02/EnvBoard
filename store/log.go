package store

import (
	"database/sql"
	"fmt"

	"envboard/model"
)

func InsertLog(db *sql.DB, userID *int, event, ipAddress, userAgent, details *string) error {
	_, err := db.Exec(
		`INSERT INTO logs (user_id, event, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)`,
		userID, event, ipAddress, userAgent, details,
	)
	if err != nil {
		return fmt.Errorf("store.InsertLog: %w", err)
	}
	return nil
}

func InsertAdminAction(db *sql.DB, adminID int, action string, targetType *string, targetID *int, details *string) error {
	_, err := db.Exec(
		`INSERT INTO admin_actions (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`,
		adminID, action, targetType, targetID, details,
	)
	if err != nil {
		return fmt.Errorf("store.InsertAdminAction: %w", err)
	}
	return nil
}

func ListLogs(db *sql.DB, limit, offset int) ([]model.Log, error) {
	query := `
		SELECT id, user_id, event, ip_address, user_agent, details, created_at
		FROM logs
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`

	rows, err := db.Query(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("store.ListLogs: %w", err)
	}
	defer rows.Close()

	var logs []model.Log
	for rows.Next() {
		var l model.Log
		err := rows.Scan(
			&l.ID, &l.UserID, &l.Event,
			&l.IPAddress, &l.UserAgent, &l.Details, &l.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("store.ListLogs: scan: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func ListAdminActions(db *sql.DB, limit, offset int) ([]model.AdminAction, error) {
	query := `
		SELECT id, admin_id, action, target_type, target_id, details, created_at
		FROM admin_actions
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`

	rows, err := db.Query(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("store.ListAdminActions: %w", err)
	}
	defer rows.Close()

	var actions []model.AdminAction
	for rows.Next() {
		var a model.AdminAction
		err := rows.Scan(
			&a.ID, &a.AdminID, &a.Action,
			&a.TargetType, &a.TargetID, &a.Details, &a.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("store.ListAdminActions: scan: %w", err)
		}
		actions = append(actions, a)
	}
	return actions, nil
}
