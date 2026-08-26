package store

import (
	"database/sql"
	"fmt"

	"envboard/model"
)

func ListEnvironments(db *sql.DB) ([]model.Environment, error) {
	query := `
		SELECT id, name, description, console_url, is_active, created_at, updated_at
		FROM environments
		ORDER BY name ASC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("store.ListEnvironments: %w", err)
	}
	defer rows.Close()

	var envs []model.Environment
	for rows.Next() {
		var e model.Environment
		err := rows.Scan(
			&e.ID, &e.Name, &e.Description, &e.ConsoleURL,
			&e.IsActive, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("store.ListEnvironments: scan: %w", err)
		}
		envs = append(envs, e)
	}
	return envs, nil
}

func GetEnvironmentByID(db *sql.DB, id int) (*model.Environment, error) {
	e := &model.Environment{}
	query := `
		SELECT id, name, description, console_url, is_active, created_at, updated_at
		FROM environments
		WHERE id = ?`

	err := db.QueryRow(query, id).Scan(
		&e.ID, &e.Name, &e.Description, &e.ConsoleURL,
		&e.IsActive, &e.CreatedAt, &e.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store.GetEnvironmentByID: %w", err)
	}
	return e, nil
}

func CreateEnvironment(db *sql.DB, name, description, consoleURL string) (*model.Environment, error) {
	query := `
		INSERT INTO environments (name, description, console_url)
		VALUES (?, ?, ?)`

	result, err := db.Exec(query, name, description, consoleURL)
	if err != nil {
		return nil, fmt.Errorf("store.CreateEnvironment: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("store.CreateEnvironment: last insert id: %w", err)
	}

	return GetEnvironmentByID(db, int(id))
}

func UpdateEnvironment(db *sql.DB, id int, name, description, consoleURL string) (*model.Environment, error) {
	query := `
		UPDATE environments
		SET name = ?, description = ?, console_url = ?
		WHERE id = ?`

	_, err := db.Exec(query, name, description, consoleURL, id)
	if err != nil {
		return nil, fmt.Errorf("store.UpdateEnvironment: %w", err)
	}

	return GetEnvironmentByID(db, id)
}

func SetEnvironmentActive(db *sql.DB, id int, isActive bool) (*model.Environment, error) {
	_, err := db.Exec(`UPDATE environments SET is_active = ? WHERE id = ?`, isActive, id)
	if err != nil {
		return nil, fmt.Errorf("store.SetEnvironmentActive: %w", err)
	}

	return GetEnvironmentByID(db, id)
}
