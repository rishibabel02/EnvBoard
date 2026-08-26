package service

import (
	"database/sql"
	"fmt"

	"envboard/model"
	"envboard/store"
)

const defaultHistoryLimit = 20

type HistoryPage struct {
	Entries []model.History `json:"entries"`
	Total   int             `json:"total"`
	Limit   int             `json:"limit"`
	Offset  int             `json:"offset"`
}

func ListHistory(db *sql.DB, envID, limit, offset int) (*HistoryPage, error) {
	env, err := store.GetEnvironmentByID(db, envID)
	if err != nil {
		return nil, fmt.Errorf("service.ListHistory: %w", err)
	}
	if env == nil {
		return nil, ErrNotFound
	}

	if limit <= 0 {
		limit = defaultHistoryLimit
	}
	if offset < 0 {
		offset = 0
	}

	entries, err := store.ListHistory(db, envID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("service.ListHistory: %w", err)
	}

	total, err := store.CountHistory(db, envID)
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
