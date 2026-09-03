package handler

import (
	"database/sql"
	"encoding/json"
	"net"
	"net/http"
	"strconv"

	"envboard/middleware"
	"envboard/service"
	"envboard/store"
)

func ClaimEnvironment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := middleware.GetUserID(r)

		if err := store.CheckRateLimit(db, userID, "claim"); err != nil {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please slow down")
			return
		}

		var req struct {
			EnvironmentID   int    `json:"environment_id"`
			Purpose         string `json:"purpose"`
			DurationMinutes int    `json:"duration_minutes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		hold, err := service.ClaimEnvironment(db, req.EnvironmentID, userID, req.Purpose, req.DurationMinutes)
		if err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
			case service.ErrEnvInactive:
				writeError(w, http.StatusConflict, "ENV_INACTIVE", "environment is not active")
			case service.ErrEnvTaken:
				writeError(w, http.StatusConflict, "ENV_TAKEN", "environment is already claimed")
			case service.ErrHoldLimitExceeded:
				writeError(w, http.StatusConflict, "HOLD_LIMIT", "you already have 2 active holds")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		service.LogEvent(db, &userID, "hold_claimed", ip, r.Header.Get("User-Agent"))
		writeJSON(w, http.StatusCreated, map[string]interface{}{"data": hold})
	}
}

func ExtendHold(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := middleware.GetUserID(r)

		if err := store.CheckRateLimit(db, userID, "extend"); err != nil {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please slow down")
			return
		}

		holdID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid hold id")
			return
		}

		var req struct {
			AddMinutes int `json:"add_minutes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		hold, err := service.ExtendHold(db, holdID, userID, req.AddMinutes)
		if err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "hold not found")
			case service.ErrHoldNotActive:
				writeError(w, http.StatusConflict, "HOLD_NOT_ACTIVE", "hold is not active")
			case service.ErrHoldExpired:
				writeError(w, http.StatusConflict, "HOLD_EXPIRED", "hold has expired")
			case service.ErrHoldNotOwned:
				writeError(w, http.StatusForbidden, "FORBIDDEN", "you do not own this hold")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		service.LogEvent(db, &userID, "hold_extended", ip, r.Header.Get("User-Agent"))
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": hold})
	}
}

func ReleaseHold(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := middleware.GetUserID(r)

		if err := store.CheckRateLimit(db, userID, "release"); err != nil {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please slow down")
			return
		}

		holdID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid hold id")
			return
		}

		if err := service.ReleaseHold(db, holdID, userID); err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "hold not found")
			case service.ErrHoldNotActive:
				writeError(w, http.StatusConflict, "HOLD_NOT_ACTIVE", "hold is not active")
			case service.ErrHoldExpired:
				writeError(w, http.StatusConflict, "HOLD_EXPIRED", "hold has expired")
			case service.ErrHoldNotOwned:
				writeError(w, http.StatusForbidden, "FORBIDDEN", "you do not own this hold")
			default:
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not release hold")
			}
			return
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		service.LogEvent(db, &userID, "hold_released", ip, r.Header.Get("User-Agent"))
		writeJSON(w, http.StatusOK, map[string]interface{}{"message": "hold released"})
	}
}

func ReclaimHold(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID := middleware.GetUserID(r)

		if err := store.CheckRateLimit(db, adminID, "reclaim"); err != nil {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please slow down")
			return
		}

		holdID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid hold id")
			return
		}

		var req struct {
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
			return
		}

		if err := service.ReclaimHold(db, holdID, adminID, req.Reason); err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "hold not found")
			case service.ErrHoldNotActive:
				writeError(w, http.StatusConflict, "HOLD_NOT_ACTIVE", "hold is not active")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		service.LogEvent(db, &adminID, "hold_reclaimed", ip, r.Header.Get("User-Agent"))
		writeJSON(w, http.StatusOK, map[string]interface{}{"message": "hold reclaimed"})
	}
}
