package service

import (
	"database/sql"
	"fmt"
	"time"

	"envboard/model"
	"envboard/store"
)

const (
	defaultAuditLimit = 50
	maxAuditLimit     = 500
)

var validAuditActions = map[string]bool{
	"claimed": true, "extended": true, "released": true, "expired": true, "reclaimed": true,
}

type AuditPage struct {
	Items  []model.AuditItem `json:"items"`
	Total  int               `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

type AuditParams struct {
	Action        string
	EnvironmentID int
	UserID        int
	From          string
	To            string
	Limit         int
	Offset        int
}

func AdminListAudit(db *sql.DB, p AuditParams) (*AuditPage, error) {
	if p.Action != "" && !validAuditActions[p.Action] {
		return nil, fmt.Errorf("invalid action: must be one of claimed, extended, released, expired, reclaimed")
	}

	limit := p.Limit
	if limit <= 0 {
		limit = defaultAuditLimit
	}
	if limit > maxAuditLimit {
		limit = maxAuditLimit
	}

	offset := p.Offset
	if offset < 0 {
		offset = 0
	}

	f := store.AuditFilter{
		Action:        p.Action,
		EnvironmentID: p.EnvironmentID,
		UserID:        p.UserID,
		Limit:         limit,
		Offset:        offset,
	}

	if p.From != "" {
		t, err := time.Parse(time.RFC3339, p.From)
		if err != nil {
			return nil, fmt.Errorf("invalid from date: must be RFC3339 format (e.g. 2006-01-02T15:04:05Z)")
		}
		f.From = &t
	}
	if p.To != "" {
		t, err := time.Parse(time.RFC3339, p.To)
		if err != nil {
			return nil, fmt.Errorf("invalid to date: must be RFC3339 format (e.g. 2006-01-02T15:04:05Z)")
		}
		f.To = &t
	}

	items, err := store.ListAudit(db, f)
	if err != nil {
		return nil, fmt.Errorf("service.AdminListAudit: %w", err)
	}

	total, err := store.CountAudit(db, f)
	if err != nil {
		return nil, fmt.Errorf("service.AdminListAudit: count: %w", err)
	}

	if items == nil {
		items = []model.AuditItem{}
	}

	return &AuditPage{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}
