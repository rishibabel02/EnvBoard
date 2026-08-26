package service

import (
	"database/sql"
	"fmt"
	"strings"

	"envboard/model"
	"envboard/store"
)

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

func CreateEnvironment(db *sql.DB, name, description, consoleURL string) (*model.Environment, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("%w: name is required", ErrNotFound)
	}

	env, err := store.CreateEnvironment(db, name, description, consoleURL)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil, fmt.Errorf("environment name already exists")
		}
		return nil, fmt.Errorf("service.CreateEnvironment: %w", err)
	}
	return env, nil
}

func UpdateEnvironment(db *sql.DB, id int, name, description, consoleURL string) (*model.Environment, error) {
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
	return env, nil
}

func SetEnvironmentActive(db *sql.DB, id int, isActive bool) (*model.Environment, error) {
	existing, err := store.GetEnvironmentByID(db, id)
	if err != nil {
		return nil, fmt.Errorf("service.SetEnvironmentActive: %w", err)
	}
	if existing == nil {
		return nil, ErrNotFound
	}

	env, err := store.SetEnvironmentActive(db, id, isActive)
	if err != nil {
		return nil, fmt.Errorf("service.SetEnvironmentActive: %w", err)
	}
	return env, nil
}
