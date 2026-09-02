package service

import (
	"database/sql"
	"fmt"
	"time"

	"envboard/model"
	"envboard/store"
)

func GetBoardState(db *sql.DB) ([]model.BoardEntry, error) {
	// Best-effort: write history rows for any holds that expired since the last read.
	store.WriteExpiredHoldHistories(db)

	envs, err := store.ListEnvironments(db)
	if err != nil {
		return nil, fmt.Errorf("service.GetBoardState: %w", err)
	}

	activeHolds, err := store.GetActiveHoldsForBoard(db)
	if err != nil {
		return nil, fmt.Errorf("service.GetBoardState: %w", err)
	}

	entries := make([]model.BoardEntry, 0, len(envs))

	for _, env := range envs {
		entry := model.BoardEntry{
			ID:          env.ID,
			Name:        env.Name,
			Description: env.Description,
			ConsoleURL:  env.ConsoleURL,
		}

		if !env.IsActive {
			entry.Status = "unavailable"
			entries = append(entries, entry)
			continue
		}

		ah, held := activeHolds[env.ID]
		if !held {
			entry.Status = "available"
			entries = append(entries, entry)
			continue
		}

		entry.Status = "in_use"
		entry.Hold = &model.BoardHoldInfo{
			ID:               ah.HoldID,
			Holder:           model.HolderInfo{ID: ah.UserID, Name: ah.HolderName},
			Purpose:          ah.Purpose,
			StartedAt:        ah.StartedAt,
			ExpiresAt:        ah.ExpiresAt,
			SecondsRemaining: int64(time.Until(ah.ExpiresAt).Seconds()),
		}
		entries = append(entries, entry)
	}

	return entries, nil
}
