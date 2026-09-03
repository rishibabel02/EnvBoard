-- ============================================================
-- EnvBoard Database Schema
-- Run this file in MySQL Workbench to set up the database.
-- ============================================================

CREATE DATABASE IF NOT EXISTS envboard
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE envboard;

-- ============================================================
-- Table: users
-- Everyone who can log in. No self-service signup.
-- Admin creates all users.
-- ============================================================

CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('member', 'admin') NOT NULL DEFAULT 'member',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);

-- ============================================================
-- Table: environments
-- The list of test environments that can be claimed.
-- ============================================================

CREATE TABLE environments (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    console_url VARCHAR(500),
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_environments_name (name)
);

-- ============================================================
-- Table: holds
-- Every reservation ever made.
-- Expiry is determined at read time using expires_at vs NOW().
-- No background job flips status — the app checks on every read.
-- ============================================================

CREATE TABLE holds (
    id             INT  NOT NULL AUTO_INCREMENT,
    environment_id INT  NOT NULL,
    user_id        INT  NOT NULL,
    purpose        TEXT NOT NULL,
    started_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at     DATETIME NOT NULL,
    released_at    DATETIME,
    status         ENUM('active', 'released', 'expired', 'reclaimed') NOT NULL DEFAULT 'active',

    PRIMARY KEY (id),

    -- Speeds up: "is environment #3 currently held?"
    KEY idx_holds_env_status  (environment_id, status),

    -- Speeds up: "how many active holds does user #5 have?"
    KEY idx_holds_user_status (user_id, status),

    CONSTRAINT fk_holds_environment FOREIGN KEY (environment_id) REFERENCES environments (id),
    CONSTRAINT fk_holds_user        FOREIGN KEY (user_id)        REFERENCES users (id)
);

-- ============================================================
-- Table: history
-- Append-only audit log. Never updated or deleted.
-- One row written for every hold event.
-- ============================================================

CREATE TABLE history (
    id             INT  NOT NULL AUTO_INCREMENT,
    environment_id INT  NOT NULL,
    user_id        INT  NOT NULL,
    hold_id        INT,
    action         ENUM('claimed', 'extended', 'released', 'expired', 'reclaimed') NOT NULL,
    reason         TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Speeds up: "show all history for environment #3"
    KEY idx_history_environment (environment_id),

    CONSTRAINT fk_history_environment FOREIGN KEY (environment_id) REFERENCES environments (id),
    CONSTRAINT fk_history_user        FOREIGN KEY (user_id)        REFERENCES users (id),
    CONSTRAINT fk_history_hold        FOREIGN KEY (hold_id)        REFERENCES holds (id)
);

-- ============================================================
-- Table: logs
-- Application-level event log: logins, auth failures, rate
-- limit hits, and other system-level events.
-- Separate from history (which is hold-specific).
-- ============================================================

CREATE TABLE logs (
    id         INT          NOT NULL AUTO_INCREMENT,
    user_id    INT,
    event      VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details    TEXT,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Speeds up: "show all log entries for user #5"
    KEY idx_logs_user       (user_id),

    -- Speeds up: time-range queries on logs
    KEY idx_logs_created_at (created_at),

    -- user_id nullable: failed logins have no authenticated user yet
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ============================================================
-- Table: admin_actions
-- Tracks every management action an admin performs:
-- creating users, changing roles, deactivating users,
-- creating/editing/toggling environments.
-- Separate from history (which is hold-specific).
-- ============================================================

CREATE TABLE admin_actions (
    id          INT          NOT NULL AUTO_INCREMENT,
    admin_id    INT          NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id   INT,
    details     TEXT,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Speeds up: "show all actions taken by admin #2"
    KEY idx_admin_actions_admin (admin_id),

    CONSTRAINT fk_admin_actions_admin FOREIGN KEY (admin_id) REFERENCES users (id)
);
