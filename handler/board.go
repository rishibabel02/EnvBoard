package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"envboard/middleware"
	"envboard/notification"
	"envboard/service"
	"envboard/store"
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

		userID := middleware.GetUserID(r)
		// tracks hold IDs for which the 5-min warning has already been sent this session
		notifiedExpiry := map[int]bool{}

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
				sendPendingNotifications(w, flusher, userID)
				checkExpiryWarnings(w, flusher, db, userID, notifiedExpiry)
			case <-r.Context().Done():
				return
			}
		}
	}
}

func sendPendingNotifications(w http.ResponseWriter, flusher http.Flusher, userID int) {
	notifs := notification.Pop(userID)
	for _, n := range notifs {
		data, err := json.Marshal(map[string]interface{}{
			"type": "notification",
			"data": n,
		})
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
	}
	if len(notifs) > 0 {
		flusher.Flush()
	}
}

func checkExpiryWarnings(w http.ResponseWriter, flusher http.Flusher, db *sql.DB, userID int, notified map[int]bool) {
	expiring, err := store.GetExpiringHoldsForUser(db, userID, 5)
	if err != nil {
		return
	}

	sent := false
	for _, h := range expiring {
		if notified[h.HoldID] {
			continue
		}
		notified[h.HoldID] = true

		data, err := json.Marshal(map[string]interface{}{
			"type": "notification",
			"data": notification.Notif{
				Type:        "expiry_warning",
				EnvName:     h.EnvName,
				MinutesLeft: 5,
			},
		})
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		sent = true
	}
	if sent {
		flusher.Flush()
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
