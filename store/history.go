package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"envboard/model"
)

type HistoryFilter struct {
	EnvID  int
	Action string
	From   *time.Time
	To     *time.Time
	Limit  int
	Offset int
}

func buildHistoryWhere(f HistoryFilter) (string, []interface{}) {
	clauses := []string{"h.environment_id = ?"}
	args := []interface{}{f.EnvID}

	if f.Action != "" {
		clauses = append(clauses, "h.action = ?")
		args = append(args, f.Action)
	}
	if f.From != nil {
		clauses = append(clauses, "h.created_at >= ?")
		args = append(args, *f.From)
	}
	if f.To != nil {
		clauses = append(clauses, "h.created_at <= ?")
		args = append(args, *f.To)
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

func InsertHistory(db *sql.DB, envID, userID int, holdID *int, action string, reason *string, actorID *int) error {
	_, err := db.Exec(
		`INSERT INTO history (environment_id, user_id, actor_id, hold_id, action, reason) VALUES (?, ?, ?, ?, ?, ?)`,
		envID, userID, actorID, holdID, action, reason,
	)
	if err != nil {
		return fmt.Errorf("store.InsertHistory: %w", err)
	}
	return nil
}

func ListHistory(db *sql.DB, f HistoryFilter) ([]model.History, error) {
	where, args := buildHistoryWhere(f)

	query := fmt.Sprintf(`
		SELECT
			h.id, h.environment_id,
			h.user_id,    COALESCE(u1.name, '') AS user_name,
			h.actor_id,   COALESCE(u2.name, '') AS actor_name,
			h.hold_id, h.action, h.reason, h.created_at
		FROM history h
		LEFT JOIN users u1 ON u1.id = h.user_id
		LEFT JOIN users u2 ON u2.id = h.actor_id
		%s
		ORDER BY h.created_at DESC
		LIMIT ? OFFSET ?`, where)

	args = append(args, f.Limit, f.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("store.ListHistory: %w", err)
	}
	defer rows.Close()

	var entries []model.History
	for rows.Next() {
		var h model.History
		if err := rows.Scan(
			&h.ID, &h.EnvironmentID,
			&h.UserID, &h.UserName,
			&h.ActorID, &h.ActorName,
			&h.HoldID, &h.Action, &h.Reason, &h.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("store.ListHistory: scan: %w", err)
		}
		entries = append(entries, h)
	}
	return entries, nil
}

func CountHistory(db *sql.DB, f HistoryFilter) (int, error) {
	where, args := buildHistoryWhere(f)

	query := fmt.Sprintf(`SELECT COUNT(*) FROM history h %s`, where)

	var count int
	if err := db.QueryRow(query, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("store.CountHistory: %w", err)
	}
	return count, nil
}
