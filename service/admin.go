package service

import (
	"database/sql"
	"fmt"
	"strings"

	"envboard/model"
	"envboard/store"
)

const defaultAdminLimit = 5

func AdminListUsers(db *sql.DB) ([]model.User, error) {
	users, err := store.ListUsers(db)
	if err != nil {
		return nil, fmt.Errorf("service.AdminListUsers: %w", err)
	}
	if users == nil {
		users = []model.User{}
	}
	return users, nil
}

func AdminCreateUser(db *sql.DB, adminID int, name, email, password, role string) (*model.User, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" || email == "" || password == "" {
		return nil, fmt.Errorf("name, email, and password are required")
	}
	if role != "member" && role != "admin" {
		return nil, fmt.Errorf("role must be 'member' or 'admin'")
	}

	hash, err := HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("service.AdminCreateUser: %w", err)
	}

	user, err := store.CreateUser(db, name, email, hash, role)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil, fmt.Errorf("email already in use")
		}
		return nil, fmt.Errorf("service.AdminCreateUser: %w", err)
	}

	targetType := "user"
	details := fmt.Sprintf("created %s with role %s", email, role)
	store.InsertAdminAction(db, adminID, "create_user", &targetType, &user.ID, &details)

	return user, nil
}

func AdminUpdateUserRole(db *sql.DB, adminID, targetID int, role string) (*model.User, error) {
	if role != "member" && role != "admin" {
		return nil, fmt.Errorf("role must be 'member' or 'admin'")
	}
	user, err := store.GetUserByID(db, targetID)
	if err != nil {
		return nil, fmt.Errorf("service.AdminUpdateUserRole: %w", err)
	}
	if user == nil {
		return nil, ErrNotFound
	}
	if err := store.UpdateUserRole(db, targetID, role); err != nil {
		return nil, fmt.Errorf("service.AdminUpdateUserRole: %w", err)
	}

	targetType := "user"
	details := fmt.Sprintf("role changed to %s", role)
	store.InsertAdminAction(db, adminID, "update_role", &targetType, &targetID, &details)

	return store.GetUserByID(db, targetID)
}

func AdminSetUserActive(db *sql.DB, adminID, targetID int, isActive bool) (*model.User, error) {
	user, err := store.GetUserByID(db, targetID)
	if err != nil {
		return nil, fmt.Errorf("service.AdminSetUserActive: %w", err)
	}
	if user == nil {
		return nil, ErrNotFound
	}
	if err := store.SetUserActive(db, targetID, isActive); err != nil {
		return nil, fmt.Errorf("service.AdminSetUserActive: %w", err)
	}

	targetType := "user"
	action := "deactivate_user"
	if isActive {
		action = "activate_user"
	}
	details := fmt.Sprintf("is_active set to %v", isActive)
	store.InsertAdminAction(db, adminID, action, &targetType, &targetID, &details)

	return store.GetUserByID(db, targetID)
}

func AdminResetUserPassword(db *sql.DB, adminID, targetID int, newPassword string) error {
	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	user, err := store.GetUserByID(db, targetID)
	if err != nil {
		return fmt.Errorf("service.AdminResetUserPassword: %w", err)
	}
	if user == nil {
		return ErrNotFound
	}
	hash, err := HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("service.AdminResetUserPassword: %w", err)
	}
	if err := store.UpdateUserPassword(db, targetID, hash); err != nil {
		return fmt.Errorf("service.AdminResetUserPassword: %w", err)
	}

	targetType := "user"
	details := "password reset by admin"
	store.InsertAdminAction(db, adminID, "reset_password", &targetType, &targetID, &details)

	return nil
}

func AdminListLogs(db *sql.DB, limit, offset int) ([]model.Log, error) {
	if limit <= 0 {
		limit = defaultAdminLimit
	}
	if offset < 0 {
		offset = 0
	}
	logs, err := store.ListLogs(db, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("service.AdminListLogs: %w", err)
	}
	if logs == nil {
		logs = []model.Log{}
	}
	return logs, nil
}

func AdminListActions(db *sql.DB, limit, offset int) ([]model.AdminAction, error) {
	if limit <= 0 {
		limit = defaultAdminLimit
	}
	if offset < 0 {
		offset = 0
	}
	actions, err := store.ListAdminActions(db, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("service.AdminListActions: %w", err)
	}
	if actions == nil {
		actions = []model.AdminAction{}
	}
	return actions, nil
}
