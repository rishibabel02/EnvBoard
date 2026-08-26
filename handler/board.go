package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"envboard/service"
)

func GetBoard(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		board, err := service.GetBoardState(db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load board")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": board})
	}
}

func BoardStream(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "streaming not supported")
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		sendBoardEvent(w, flusher, db)

		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				sendBoardEvent(w, flusher, db)
			case <-r.Context().Done():
				return
			}
		}
	}
}

func sendBoardEvent(w http.ResponseWriter, flusher http.Flusher, db *sql.DB) {
	board, err := service.GetBoardState(db)
	if err != nil {
		fmt.Fprintf(w, "data: {\"error\":\"internal error\"}\n\n")
		flusher.Flush()
		return
	}

	data, err := json.Marshal(map[string]interface{}{
		"type": "board_update",
		"data": board,
	})
	if err != nil {
		return
	}

	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
}
