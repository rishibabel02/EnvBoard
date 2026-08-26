package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"envboard/middleware"
	"envboard/service"
)

func AdminListUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := service.AdminListUsers(db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not list users")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": users})
	}
}

func AdminCreateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID := middleware.GetUserID(r)

		var req struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		user, err := service.AdminCreateUser(db, adminID, req.Name, req.Email, req.Password, req.Role)
		if err != nil {
			switch {
			case containsAny(err.Error(), "required", "must be"):
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			case containsAny(err.Error(), "already in use"):
				writeError(w, http.StatusConflict, "CONFLICT", err.Error())
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not create user")
			}
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"data": user})
	}
}

func AdminUpdateUserRole(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID := middleware.GetUserID(r)
		targetID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid user id")
			return
		}

		var req struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		user, err := service.AdminUpdateUserRole(db, adminID, targetID, req.Role)
		if err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": user})
	}
}

func AdminSetUserActive(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID := middleware.GetUserID(r)
		targetID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid user id")
			return
		}

		var req struct {
			IsActive bool `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		user, err := service.AdminSetUserActive(db, adminID, targetID, req.IsActive)
		if err != nil {
			if err == service.ErrNotFound {
				writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update user")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": user})
	}
}

func AdminResetUserPassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID := middleware.GetUserID(r)
		targetID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid user id")
			return
		}

		var req struct {
			NewPassword string `json:"new_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		if err := service.AdminResetUserPassword(db, adminID, targetID, req.NewPassword); err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"message": "password updated"})
	}
}

func AdminListLogs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		logs, err := service.AdminListLogs(db, limit, offset)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load logs")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": logs})
	}
}

func AdminListActions(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		actions, err := service.AdminListActions(db, limit, offset)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load admin actions")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": actions})
	}
}

func containsAny(s string, substrings ...string) bool {
	for _, sub := range substrings {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}
