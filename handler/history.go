package handler

import (
	"database/sql"
	"net/http"
	"strconv"

	"envboard/service"
)

func ListHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		envID, err := strconv.Atoi(r.PathValue("id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_ID", "invalid environment id")
			return
		}

		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		page, err := service.ListHistory(db, envID, limit, offset)
		if err != nil {
			if err == service.ErrNotFound {
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load history")
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"data": page})
	}
}
