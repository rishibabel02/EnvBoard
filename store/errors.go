package store

import "errors"

var (
	ErrEnvTaken          = errors.New("environment is already held")
	ErrHoldLimitExceeded = errors.New("you already have 2 active holds")
)
