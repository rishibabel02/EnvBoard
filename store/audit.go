package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"envboard/model"
)

type AuditFilter struct {
	Action        string
	EnvironmentID int
	UserID        int
	From          *time.Time
	To            *time.Time
	Limit         int
	Offset        int
}

func buildAuditWhere(f AuditFilter) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if f.Action != "" {
		clauses = append(clauses, "h.action = ?")
		args = append(args, f.Action)
	}
	if f.EnvironmentID > 0 {
		clauses = append(clauses, "h.environment_id = ?")
		args = append(args, f.EnvironmentID)
	}
	if f.UserID > 0 {
		clauses = append(clauses, "h.user_id = ?")
		args = append(args, f.UserID)
	}
	if f.From != nil {
		clauses = append(clauses, "h.created_at >= ?")
		args = append(args, *f.From)
	}
	if f.To != nil {
		clauses = append(clauses, "h.created_at <= ?")
		args = append(args, *f.To)
	}

	where := ""
	if len(clauses) > 0 {
		where = "WHERE " + strings.Join(clauses, " AND ")
	}
	return where, args
}

func ListAudit(db *sql.DB, f AuditFilter) ([]model.AuditItem, error) {
	where, args := buildAuditWhere(f)

	query := fmt.Sprintf(`
		SELECT
			h.id, h.environment_id, COALESCE(e.name, '') AS environment_name,
			h.hold_id,
			h.user_id,  COALESCE(u1.name, '') AS user_name,
			h.actor_id, COALESCE(u2.name, '') AS actor_name,
			h.action, h.reason, h.created_at
		FROM history h
		LEFT JOIN environments e  ON e.id  = h.environment_id
		LEFT JOIN users u1        ON u1.id = h.user_id
		LEFT JOIN users u2        ON u2.id = h.actor_id
		%s
		ORDER BY h.created_at DESC
		LIMIT ? OFFSET ?`, where)

	args = append(args, f.Limit, f.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("store.ListAudit: %w", err)
	}
	defer rows.Close()

	var items []model.AuditItem
	for rows.Next() {
		var a model.AuditItem
		if err := rows.Scan(
			&a.ID, &a.EnvironmentID, &a.EnvironmentName,
			&a.HoldID,
			&a.UserID, &a.UserName,
			&a.ActorID, &a.ActorName,
			&a.Action, &a.Reason, &a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("store.ListAudit: scan: %w", err)
		}
		items = append(items, a)
	}
	return items, nil
}

func CountAudit(db *sql.DB, f AuditFilter) (int, error) {
	where, args := buildAuditWhere(f)

	query := fmt.Sprintf(`SELECT COUNT(*) FROM history h %s`, where)

	var count int
	if err := db.QueryRow(query, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("store.CountAudit: %w", err)
	}
	return count, nil
}
