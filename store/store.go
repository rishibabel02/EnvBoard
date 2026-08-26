package store

import (
    "database/sql"
    "fmt"

    _ "github.com/go-sql-driver/mysql"
)

func NewDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("mysql", dsn)
    if err != nil {
        return nil, fmt.Errorf("store.NewDB: open: %w", err)
    }

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("store.NewDB: ping: %w", err)
    }

    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)

    return db, nil
}
