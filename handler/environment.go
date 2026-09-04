package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"envboard/middleware"
	"envboard/notification"
	"envboard/service"
	"envboard/store"
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

		adminID := middleware.GetUserID(r)
		env, err := service.CreateEnvironment(db, adminID, req.Name, req.Description, req.ConsoleURL)
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

		adminID := middleware.GetUserID(r)
		env, err := service.UpdateEnvironment(db, adminID, id, req.Name, req.Description, req.ConsoleURL)
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

func DeleteEnvironment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathIDFromValue(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid environment id")
			return
		}

		adminID := middleware.GetUserID(r)
		if err := service.DeleteEnvironment(db, adminID, id); err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
			default:
				writeError(w, http.StatusConflict, "CONFLICT", err.Error())
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"message": "environment deleted"})
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
			Force    bool `json:"force"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		adminID := middleware.GetUserID(r)
		env, releasedUserID, err := service.SetEnvironmentActive(db, adminID, id, req.IsActive, req.Force)
		if err != nil {
			switch {
			case err == service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
			default:
				if ahe, ok := err.(*service.ActiveHoldError); ok {
					writeJSON(w, http.StatusConflict, map[string]interface{}{
						"code": "HAS_ACTIVE_HOLD",
						"holder": map[string]interface{}{
							"name":    ahe.HolderName,
							"purpose": ahe.Purpose,
						},
					})
					return
				}
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update environment")
			}
			return
		}

		// If a hold was force-released, notify the holder and get env name for notification
		if releasedUserID > 0 {
			envName := env.Name
			// get admin name for the notification
			adminName := ""
			if u, err := store.GetUserByID(db, adminID); err == nil && u != nil {
				adminName = u.Name
			}
			notification.Push(releasedUserID, notification.Notif{
				Type:      "env_deactivated",
				EnvName:   envName,
				AdminName: adminName,
			})
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"data": env})
	}
}

