package service

import (
	"database/sql"

	"envboard/store"
)


// Errors are intentionally ignored — a logging failure must never affect the response.
func LogEvent(db *sql.DB, userID *int, event, ipAddress, userAgent string) {
	store.InsertLog(db, userID, &event, &ipAddress, &userAgent, nil)
}
