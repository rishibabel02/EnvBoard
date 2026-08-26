package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"envboard/service"
)


func pathIDFromValue(r *http.Request) (int, error) {
	return strconv.Atoi(r.PathValue("id"))
}

func ListEnvironments(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		envs, err := service.ListEnvironments(db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not list environments")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": envs})
	}
}

func GetEnvironment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathIDFromValue(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid environment id")
			return
		}

		env, err := service.GetEnvironment(db, id)
		if err != nil {
			if err == service.ErrNotFound {
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not get environment")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": env})
	}
}

func CreateEnvironment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			ConsoleURL  string `json:"console_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		env, err := service.CreateEnvironment(db, req.Name, req.Description, req.ConsoleURL)
		if err != nil {
			switch {
			case strings.Contains(err.Error(), "name is required"):
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "name is required")
			case strings.Contains(err.Error(), "already exists"):
				writeError(w, http.StatusConflict, "CONFLICT", "environment name already exists")
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not create environment")
			}
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"data": env})
	}
}

func UpdateEnvironment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathIDFromValue(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid environment id")
			return
		}

		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			ConsoleURL  string `json:"console_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		env, err := service.UpdateEnvironment(db, id, req.Name, req.Description, req.ConsoleURL)
		if err != nil {
			switch {
			case err == service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
			case strings.Contains(err.Error(), "already exists"):
				writeError(w, http.StatusConflict, "CONFLICT", "environment name already exists")
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update environment")
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": env})
	}
}

func SetEnvironmentActive(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathIDFromValue(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid environment id")
			return
		}

		var req struct {
			IsActive bool `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		env, err := service.SetEnvironmentActive(db, id, req.IsActive)
		if err != nil {
			if err == service.ErrNotFound {
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update environment")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": env})
	}
}

