package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"envboard/handler"
	"envboard/middleware"
	"envboard/store"
)

func main() {
	_ = godotenv.Load()

	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "root:root@tcp(127.0.0.1:3306)/envboard?parseTime=true&loc=Local"
	}

	db, err := store.NewDB(dsn)
	if err != nil {
		log.Fatal("could not connect to database: ", err)
	}
	defer db.Close()

	fmt.Println("connected to database")

	mux := http.NewServeMux()

	// Public routes — no auth required
	mux.HandleFunc("POST /api/auth/login", handler.Login(db))

	// Board routes — auth required
	mux.HandleFunc("GET /api/board", middleware.Auth(db,handler.GetBoard(db)))
	mux.HandleFunc("GET /api/board/stream", middleware.Auth(db,handler.BoardStream(db)))

	// Hold routes — auth required; reclaim is admin-only
	mux.HandleFunc("POST /api/holds", middleware.Auth(db,handler.ClaimEnvironment(db)))
	mux.HandleFunc("PATCH /api/holds/{id}/extend", middleware.Auth(db,handler.ExtendHold(db)))
	mux.HandleFunc("DELETE /api/holds/{id}/release", middleware.Auth(db,handler.ReleaseHold(db)))
	mux.HandleFunc("POST /api/holds/{id}/reclaim", middleware.Auth(db,middleware.AdminOnly(handler.ReclaimHold(db))))

	// Admin routes — all admin-only
	mux.HandleFunc("GET /api/admin/users", middleware.Auth(db,middleware.AdminOnly(handler.AdminListUsers(db))))
	mux.HandleFunc("POST /api/admin/users", middleware.Auth(db,middleware.AdminOnly(handler.AdminCreateUser(db))))
	mux.HandleFunc("PATCH /api/admin/users/{id}/role", middleware.Auth(db,middleware.AdminOnly(handler.AdminUpdateUserRole(db))))
	mux.HandleFunc("PATCH /api/admin/users/{id}/status", middleware.Auth(db,middleware.AdminOnly(handler.AdminSetUserActive(db))))
	mux.HandleFunc("POST /api/admin/users/{id}/reset-password", middleware.Auth(db,middleware.AdminOnly(handler.AdminResetUserPassword(db))))
	mux.HandleFunc("GET /api/admin/logs", middleware.Auth(db,middleware.AdminOnly(handler.AdminListLogs(db))))
	mux.HandleFunc("GET /api/admin/actions", middleware.Auth(db,middleware.AdminOnly(handler.AdminListActions(db))))
	mux.HandleFunc("GET /api/admin/audit", middleware.Auth(db, middleware.AdminOnly(handler.AdminListAudit(db))))

	// History routes — auth required
	mux.HandleFunc("GET /api/environments/{id}/history", middleware.Auth(db,handler.ListHistory(db)))

	// Environment routes — admin-only
	mux.HandleFunc("GET /api/environments", middleware.Auth(db,middleware.AdminOnly(handler.ListEnvironments(db))))
	mux.HandleFunc("GET /api/environments/{id}", middleware.Auth(db,middleware.AdminOnly(handler.GetEnvironment(db))))
	mux.HandleFunc("POST /api/environments", middleware.Auth(db,middleware.AdminOnly(handler.CreateEnvironment(db))))
	mux.HandleFunc("PATCH /api/environments/{id}", middleware.Auth(db,middleware.AdminOnly(handler.UpdateEnvironment(db))))
	mux.HandleFunc("PATCH /api/environments/{id}/status", middleware.Auth(db,middleware.AdminOnly(handler.SetEnvironmentActive(db))))

	fmt.Println("server starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
