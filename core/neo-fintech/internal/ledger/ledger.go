package ledger

import (
	"errors"
	"fmt"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/money"
)

var ErrUnbalanced = errors.New("journal is not balanced per currency")

type Entry struct {
	Account    string      `json:"account"`
	Amount     money.Money `json:"amount"`
	RecordedAt time.Time   `json:"recorded_at"`
}

type Journal struct {
	ID          string    `json:"id"`
	OperationID string    `json:"operation_id"`
	Reason      string    `json:"reason"`
	Entries     []Entry   `json:"entries"`
	RecordedAt  time.Time `json:"recorded_at"`
}

func Validate(j Journal) error {
	if j.ID == "" || j.OperationID == "" {
		return errors.New("journal id and operation id are required")
	}
	if len(j.Entries) < 2 {
		return errors.New("journal requires at least two entries")
	}
	totals := map[string]int64{}
	for i, e := range j.Entries {
		if e.Account == "" {
			return fmt.Errorf("entry %d missing account", i)
		}
		if e.Amount.Currency == "" {
			return fmt.Errorf("entry %d missing currency", i)
		}
		totals[e.Amount.Currency] += e.Amount.Minor
	}
	for c, total := range totals {
		if total != 0 {
			return fmt.Errorf("%w: %s total=%d", ErrUnbalanced, c, total)
		}
	}
	return nil
}

func Reverse(original Journal, reversalID, operationID, reason string, at time.Time) Journal {
	entries := make([]Entry, 0, len(original.Entries))
	for _, e := range original.Entries {
		entries = append(entries, Entry{Account: e.Account, Amount: e.Amount.Negate(), RecordedAt: at})
	}
	return Journal{ID: reversalID, OperationID: operationID, Reason: reason, Entries: entries, RecordedAt: at}
}
