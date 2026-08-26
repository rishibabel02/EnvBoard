package handler

import (
	"database/sql"
	"encoding/json"
	"net"
	"net/http"

	"envboard/service"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "invalid request body")
			return
		}

		if req.Email == "" || req.Password == "" {
			writeError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "email and password are required")
			return
		}

		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		ua := r.Header.Get("User-Agent")

		token, user, err := service.Login(db, req.Email, req.Password)
		if err != nil {
			service.LogEvent(db, nil, "login_failed", ip, ua)
			switch err {
			case service.ErrInvalidCredentials:
				writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", err.Error())
			case service.ErrAccountDeactivated:
				writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "something went wrong")
			}
			return
		}

		service.LogEvent(db, &user.ID, "login_success", ip, ua)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"data": map[string]interface{}{
				"token": token,
				"user": map[string]interface{}{
					"id":    user.ID,
					"name":  user.Name,
					"email": user.Email,
					"role":  user.Role,
				},
			},
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}
