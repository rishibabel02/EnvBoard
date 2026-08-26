package main

import (
	"fmt"
	"log"

	"envboard/service"
	"envboard/store"
)

func main() {
	dsn := "root:root@tcp(127.0.0.1:3306)/envboard?parseTime=true"

	db, err := store.NewDB(dsn)
	if err != nil {
		log.Fatal("could not connect to database: ", err)
	}
	defer db.Close()

	hash, err := service.HashPassword("password123")
	if err != nil {
		log.Fatal("could not hash password: ", err)
	}

	user, err := store.CreateUser(db, "Admin User", "admin@test.com", hash, "admin")
	if err != nil {
		log.Fatal("could not create user: ", err)
	}

	fmt.Printf("created user: id=%d email=%s role=%s\n", user.ID, user.Email, user.Role)
}
