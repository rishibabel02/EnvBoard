package store

import (
	"database/sql"
	"fmt"

	"envboard/model"
)

func GetUserByEmail(db *sql.DB, email string) (*model.User, error) {
	u := &model.User{}
	query := `
		SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		WHERE email = ?`

	err := db.QueryRow(query, email).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash,
		&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store.GetUserByEmail: %w", err)
	}
	return u, nil
}

func GetUserByID(db *sql.DB, id int) (*model.User, error) {
	u := &model.User{}
	query := `
		SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		WHERE id = ?`

	err := db.QueryRow(query, id).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash,
		&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store.GetUserByID: %w", err)
	}
	return u, nil
}

func CreateUser(db *sql.DB, name, email, passwordHash, role string) (*model.User, error) {
	query := `
		INSERT INTO users (name, email, password_hash, role)
		VALUES (?, ?, ?, ?)`

	result, err := db.Exec(query, name, email, passwordHash, role)
	if err != nil {
		return nil, fmt.Errorf("store.CreateUser: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("store.CreateUser: last insert id: %w", err)
	}

	return GetUserByID(db, int(id))
}

func ListUsers(db *sql.DB) ([]model.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("store.ListUsers: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.PasswordHash,
			&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("store.ListUsers: scan: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

func UpdateUserRole(db *sql.DB, id int, role string) error {
	_, err := db.Exec(`UPDATE users SET role = ? WHERE id = ?`, role, id)
	if err != nil {
		return fmt.Errorf("store.UpdateUserRole: %w", err)
	}
	return nil
}

func SetUserActive(db *sql.DB, id int, isActive bool) error {
	_, err := db.Exec(`UPDATE users SET is_active = ? WHERE id = ?`, isActive, id)
	if err != nil {
		return fmt.Errorf("store.SetUserActive: %w", err)
	}
	return nil
}

func UpdateUserPassword(db *sql.DB, id int, passwordHash string) error {
	_, err := db.Exec(`UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, id)
	if err != nil {
		return fmt.Errorf("store.UpdateUserPassword: %w", err)
	}
	return nil
}
