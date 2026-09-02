CREATE TABLE rate_limits (
    user_id      INT         NOT NULL,
    action       VARCHAR(20) NOT NULL,
    window_start DATETIME    NOT NULL,
    count        INT         NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, action, window_start)
);
