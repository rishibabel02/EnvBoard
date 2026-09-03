package service

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"envboard/model"
	"envboard/store"
)

const (
	minDurationMinutes = 1
	maxDurationMinutes = 4320
)

func ClaimEnvironment(db *sql.DB, envID, userID int, purpose string, durationMinutes int) (*model.Hold, error) {
	purpose = strings.TrimSpace(purpose)
	if purpose == "" {
		return nil, fmt.Errorf("purpose is required")
	}
	if durationMinutes < minDurationMinutes || durationMinutes > maxDurationMinutes {
		return nil, fmt.Errorf("duration must be between %d and %d minutes", minDurationMinutes, maxDurationMinutes)
	}

	env, err := store.GetEnvironmentByID(db, envID)
	if err != nil {
		return nil, fmt.Errorf("service.ClaimEnvironment: %w", err)
	}
	if env == nil {
		return nil, ErrNotFound
	}
	if !env.IsActive {
		return nil, ErrEnvInactive
	}

	hold, err := store.ClaimEnvironment(db, envID, userID, purpose, durationMinutes)
	if err != nil {
		if err == store.ErrEnvTaken {
			return nil, ErrEnvTaken
		}
		if err == store.ErrHoldLimitExceeded {
			return nil, ErrHoldLimitExceeded
		}
		return nil, fmt.Errorf("service.ClaimEnvironment: %w", err)
	}
	return hold, nil
}

func ExtendHold(db *sql.DB, holdID, userID, addMinutes int) (*model.Hold, error) {
	if addMinutes < minDurationMinutes || addMinutes > maxDurationMinutes {
		return nil, fmt.Errorf("extension must be between %d and %d minutes", minDurationMinutes, maxDurationMinutes)
	}

	hold, err := store.GetHoldByID(db, holdID)
	if err != nil {
		return nil, fmt.Errorf("service.ExtendHold: %w", err)
	}
	if hold == nil {
		return nil, ErrNotFound
	}
	if hold.Status != "active" {
		return nil, ErrHoldNotActive
	}
	if time.Now().After(hold.ExpiresAt) {
		return nil, ErrHoldExpired
	}
	if hold.UserID != userID {
		return nil, ErrHoldNotOwned
	}

	result, err := store.ExtendHold(db, holdID, addMinutes)
	if err != nil {
		return nil, err
	}
	store.InsertHistory(db, hold.EnvironmentID, userID, &holdID, "extended", nil, &userID)
	return result, nil
}

func ReleaseHold(db *sql.DB, holdID, userID int) error {
	hold, err := store.GetHoldByID(db, holdID)
	if err != nil {
		return fmt.Errorf("service.ReleaseHold: %w", err)
	}
	if hold == nil {
		return ErrNotFound
	}
	if hold.Status != "active" {
		return ErrHoldNotActive
	}
	if time.Now().After(hold.ExpiresAt) {
		return ErrHoldExpired
	}
	if hold.UserID != userID {
		return ErrHoldNotOwned
	}

	return store.ReleaseHold(db, holdID, userID)
}

func ReclaimHold(db *sql.DB, holdID, adminID int, reason string) (*model.Hold, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("reason is required for reclaim")
	}

	hold, err := store.GetHoldByID(db, holdID)
	if err != nil {
		return nil, fmt.Errorf("service.ReclaimHold: %w", err)
	}
	if hold == nil {
		return nil, ErrNotFound
	}
	if hold.Status != "active" {
		return nil, ErrHoldNotActive
	}

	if err := store.ReclaimHold(db, holdID, adminID, reason); err != nil {
		return nil, err
	}
	return hold, nil
}
