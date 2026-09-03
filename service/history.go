package service

import (
	"database/sql"
	"fmt"
	"time"

	"envboard/model"
	"envboard/store"
)

const defaultHistoryLimit = 20

var validHistoryActions = map[string]bool{
	"claimed": true, "extended": true, "released": true, "expired": true, "reclaimed": true,
}

type HistoryPage struct {
	Entries []model.History `json:"entries"`
	Total   int             `json:"total"`
	Limit   int             `json:"limit"`
	Offset  int             `json:"offset"`
}

type HistoryParams struct {
	EnvID  int
	Action string
	From   string
	To     string
	Limit  int
	Offset int
}

func ListHistory(db *sql.DB, p HistoryParams) (*HistoryPage, error) {
	env, err := store.GetEnvironmentByID(db, p.EnvID)
	if err != nil {
		return nil, fmt.Errorf("service.ListHistory: %w", err)
	}
	if env == nil {
		return nil, ErrNotFound
	}

	if p.Action != "" && !validHistoryActions[p.Action] {
		return nil, fmt.Errorf("invalid action: must be one of claimed, extended, released, expired, reclaimed")
	}

	limit := p.Limit
	if limit <= 0 {
		limit = defaultHistoryLimit
	}
	offset := p.Offset
	if offset < 0 {
		offset = 0
	}

	f := store.HistoryFilter{
		EnvID:  p.EnvID,
		Action: p.Action,
		Limit:  limit,
		Offset: offset,
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

	entries, err := store.ListHistory(db, f)
	if err != nil {
		return nil, fmt.Errorf("service.ListHistory: %w", err)
	}

	total, err := store.CountHistory(db, f)
	if err != nil {
		return nil, fmt.Errorf("service.ListHistory: count: %w", err)
	}

	if entries == nil {
		entries = []model.History{}
	}

	return &HistoryPage{
		Entries: entries,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	}, nil
}
