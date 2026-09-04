package service

import (
	"database/sql"
	"fmt"
	"strings"

	"envboard/model"
	"envboard/store"
)

// ActiveHoldError is returned when deactivating an env that has an active hold.
type ActiveHoldError struct {
	HolderName string
	Purpose    string
	HoldID     int
	UserID     int
}

func (e *ActiveHoldError) Error() string {
	return fmt.Sprintf("environment is in use by %s", e.HolderName)
}

func ListEnvironments(db *sql.DB) ([]model.Environment, error) {
	envs, err := store.ListEnvironments(db)
	if err != nil {
		return nil, fmt.Errorf("service.ListEnvironments: %w", err)
	}
	return envs, nil
}

func GetEnvironment(db *sql.DB, id int) (*model.Environment, error) {
	env, err := store.GetEnvironmentByID(db, id)
	if err != nil {
		return nil, fmt.Errorf("service.GetEnvironment: %w", err)
	}
	if env == nil {
		return nil, ErrNotFound
	}
	return env, nil
}

func CreateEnvironment(db *sql.DB, adminID int, name, description, consoleURL string) (*model.Environment, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}

	env, err := store.CreateEnvironment(db, name, description, consoleURL)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil, fmt.Errorf("environment name already exists")
		}
		return nil, fmt.Errorf("service.CreateEnvironment: %w", err)
	}
	targetType := "environment"
	details := fmt.Sprintf("created environment %q", env.Name)
	_ = store.InsertAdminAction(db, adminID, "create_environment", &targetType, &env.ID, &details)
	return env, nil
}

func UpdateEnvironment(db *sql.DB, adminID, id int, name, description, consoleURL string) (*model.Environment, error) {
	existing, err := store.GetEnvironmentByID(db, id)
	if err != nil {
		return nil, fmt.Errorf("service.UpdateEnvironment: %w", err)
	}
	if existing == nil {
		return nil, ErrNotFound
	}

	name = strings.TrimSpace(name)
	if name == "" {
		name = existing.Name
	}

	env, err := store.UpdateEnvironment(db, id, name, description, consoleURL)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil, fmt.Errorf("environment name already exists")
		}
		return nil, fmt.Errorf("service.UpdateEnvironment: %w", err)
	}
	targetType := "environment"
	details := fmt.Sprintf("updated environment %q", env.Name)
	_ = store.InsertAdminAction(db, adminID, "update_environment", &targetType, &env.ID, &details)
	return env, nil
}

func DeleteEnvironment(db *sql.DB, adminID, id int) error {
	existing, err := store.GetEnvironmentByID(db, id)
	if err != nil {
		return fmt.Errorf("service.DeleteEnvironment: %w", err)
	}
	if existing == nil {
		return ErrNotFound
	}

	active, err := store.HasActiveHold(db, id)
	if err != nil {
		return fmt.Errorf("service.DeleteEnvironment: %w", err)
	}
	if active {
		return fmt.Errorf("environment has an active hold — release it first")
	}

	if err := store.DeleteEnvironment(db, id); err != nil {
		if strings.Contains(err.Error(), "foreign key constraint") {
			return fmt.Errorf("environment has history records — deactivate it instead")
		}
		return fmt.Errorf("service.DeleteEnvironment: %w", err)
	}
	targetType := "environment"
	details := fmt.Sprintf("deleted environment %q", existing.Name)
	_ = store.InsertAdminAction(db, adminID, "delete_environment", &targetType, &id, &details)
	return nil
}

// SetEnvironmentActive activates or deactivates an environment.
// When deactivating (isActive=false) and the env has an active hold:
//   - force=false → returns *ActiveHoldError so the caller can confirm
//   - force=true  → releases the hold (reclaim) then deactivates
//
// Returns the updated env and, when force=true + hold existed, the hold's UserID
// so the handler can push a notification.
func SetEnvironmentActive(db *sql.DB, adminID, id int, isActive, force bool) (*model.Environment, int, error) {
	existing, err := store.GetEnvironmentByID(db, id)
	if err != nil {
		return nil, 0, fmt.Errorf("service.SetEnvironmentActive: %w", err)
	}
	if existing == nil {
		return nil, 0, ErrNotFound
	}

	releasedUserID := 0

	if !isActive {
		hold, err := store.GetActiveHoldForEnv(db, id)
		if err != nil {
			return nil, 0, fmt.Errorf("service.SetEnvironmentActive: %w", err)
		}
		if hold != nil {
			if !force {
				return nil, 0, &ActiveHoldError{
					HolderName: hold.HolderName,
					Purpose:    hold.Purpose,
					HoldID:     hold.HoldID,
					UserID:     hold.UserID,
				}
			}
			reason := "environment deactivated by admin"
			if err := store.ReclaimHold(db, hold.HoldID, adminID, reason); err != nil {
				return nil, 0, fmt.Errorf("service.SetEnvironmentActive: release hold: %w", err)
			}
			releasedUserID = hold.UserID
		}
	}

	env, err := store.SetEnvironmentActive(db, id, isActive)
	if err != nil {
		return nil, 0, fmt.Errorf("service.SetEnvironmentActive: %w", err)
	}
	targetType := "environment"
	action := "activate_environment"
	if !isActive {
		action = "deactivate_environment"
	}
	details := fmt.Sprintf("%s %q", action, env.Name)
	_ = store.InsertAdminAction(db, adminID, action, &targetType, &env.ID, &details)
	return env, releasedUserID, nil
}
