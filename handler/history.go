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

		q := r.URL.Query()
		limit, _ := strconv.Atoi(q.Get("limit"))
		offset, _ := strconv.Atoi(q.Get("offset"))

		page, err := service.ListHistory(db, service.HistoryParams{
			EnvID:  envID,
			Action: q.Get("action"),
			From:   q.Get("from"),
			To:     q.Get("to"),
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			switch err {
			case service.ErrNotFound:
				writeError(w, http.StatusNotFound, "NOT_FOUND", "environment not found")
			default:
				writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			}
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"data": page})
	}
}
