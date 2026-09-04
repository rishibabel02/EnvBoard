package notification

import "sync"

type Notif struct {
	Type        string `json:"type"`                  // "reclaim" | "expiry_warning" | "env_deactivated"
	EnvName     string `json:"env_name"`
	Reason      string `json:"reason,omitempty"`
	AdminName   string `json:"admin_name,omitempty"`
	MinutesLeft int    `json:"minutes_left,omitempty"`
}

var mu sync.Mutex
var pending = map[int][]Notif{}

func Push(userID int, n Notif) {
	mu.Lock()
	defer mu.Unlock()
	pending[userID] = append(pending[userID], n)
}

func Pop(userID int) []Notif {
	mu.Lock()
	defer mu.Unlock()
	ns := pending[userID]
	delete(pending, userID)
	return ns
}
