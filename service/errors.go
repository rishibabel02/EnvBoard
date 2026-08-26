package service

import "errors"

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountDeactivated = errors.New("account is deactivated")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrForbidden          = errors.New("insufficient permissions")
	ErrNotFound           = errors.New("resource not found")
	ErrHoldNotOwned       = errors.New("you do not own this hold")
	ErrHoldExpired        = errors.New("hold has already expired")
	ErrHoldNotActive      = errors.New("hold is not in active state")
	ErrEnvInactive        = errors.New("environment is not active")
	ErrEnvTaken           = errors.New("environment is already claimed")
	ErrHoldLimitExceeded  = errors.New("you already have 2 active holds")
)
