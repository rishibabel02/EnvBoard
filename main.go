package main

import (
	"fmt"
	"log"
	"net/http"

	"envboard/handler"
	"envboard/middleware"
	"envboard/store"
)

func main() {
	dsn := "root:root@tcp(127.0.0.1:3306)/envboard?parseTime=true&loc=Local"

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
	mux.HandleFunc("GET /api/board", middleware.Auth(handler.GetBoard(db)))
	mux.HandleFunc("GET /api/board/stream", middleware.Auth(handler.BoardStream(db)))

	// Hold routes — auth required; reclaim is admin-only
	mux.HandleFunc("POST /api/holds", middleware.Auth(handler.ClaimEnvironment(db)))
	mux.HandleFunc("PATCH /api/holds/{id}/extend", middleware.Auth(handler.ExtendHold(db)))
	mux.HandleFunc("DELETE /api/holds/{id}/release", middleware.Auth(handler.ReleaseHold(db)))
	mux.HandleFunc("POST /api/holds/{id}/reclaim", middleware.Auth(middleware.AdminOnly(handler.ReclaimHold(db))))

	// Admin routes — all admin-only
	mux.HandleFunc("GET /api/admin/users", middleware.Auth(middleware.AdminOnly(handler.AdminListUsers(db))))
	mux.HandleFunc("POST /api/admin/users", middleware.Auth(middleware.AdminOnly(handler.AdminCreateUser(db))))
	mux.HandleFunc("PATCH /api/admin/users/{id}/role", middleware.Auth(middleware.AdminOnly(handler.AdminUpdateUserRole(db))))
	mux.HandleFunc("PATCH /api/admin/users/{id}/status", middleware.Auth(middleware.AdminOnly(handler.AdminSetUserActive(db))))
	mux.HandleFunc("POST /api/admin/users/{id}/reset-password", middleware.Auth(middleware.AdminOnly(handler.AdminResetUserPassword(db))))
	mux.HandleFunc("GET /api/admin/logs", middleware.Auth(middleware.AdminOnly(handler.AdminListLogs(db))))
	mux.HandleFunc("GET /api/admin/actions", middleware.Auth(middleware.AdminOnly(handler.AdminListActions(db))))

	// History routes — auth required
	mux.HandleFunc("GET /api/environments/{id}/history", middleware.Auth(handler.ListHistory(db)))

	// Environment routes — admin-only
	mux.HandleFunc("GET /api/environments", middleware.Auth(middleware.AdminOnly(handler.ListEnvironments(db))))
	mux.HandleFunc("GET /api/environments/{id}", middleware.Auth(middleware.AdminOnly(handler.GetEnvironment(db))))
	mux.HandleFunc("POST /api/environments", middleware.Auth(middleware.AdminOnly(handler.CreateEnvironment(db))))
	mux.HandleFunc("PATCH /api/environments/{id}", middleware.Auth(middleware.AdminOnly(handler.UpdateEnvironment(db))))
	mux.HandleFunc("PATCH /api/environments/{id}/status", middleware.Auth(middleware.AdminOnly(handler.SetEnvironmentActive(db))))

	fmt.Println("server starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
