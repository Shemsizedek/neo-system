package reconciliation

import (
	"errors"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/money"
)

type ExceptionKind string

const (
	MissingInternal ExceptionKind = "missing_internal"
	MissingExternal ExceptionKind = "missing_external"
	Duplicate ExceptionKind = "duplicate"
	AmountMismatch ExceptionKind = "amount_mismatch"
	CurrencyMismatch ExceptionKind = "currency_mismatch"
	StatusMismatch ExceptionKind = "status_mismatch"
	TimingBreak ExceptionKind = "timing_break"
)

type Item struct {
	ID string
	Rail string
	OperationID string
	Amount money.Money
	Lifecycle string
	OccurredAt time.Time
}

type Match struct {
	InternalIDs []string
	ExternalIDs []string
	Currency string
	InternalMinor int64
	ExternalMinor int64
}

func ValidateMatch(m Match) error {
	if len(m.InternalIDs) == 0 || len(m.ExternalIDs) == 0 {
		return errors.New("reconciliation match requires internal and external evidence")
	}
	if m.Currency == "" {
		return errors.New("reconciliation currency is required")
	}
	if m.InternalMinor != m.ExternalMinor {
		return errors.New("reconciliation amount mismatch")
	}
	return nil
}
