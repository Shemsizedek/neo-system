package money

import (
	"errors"
	"fmt"
	"strings"
)

var ErrCurrencyMismatch = errors.New("currency mismatch")

type Money struct {
	Minor    int64  `json:"minor"`
	Currency string `json:"currency"`
}

func New(minor int64, currency string) (Money, error) {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if len(currency) < 3 || len(currency) > 12 {
		return Money{}, fmt.Errorf("invalid currency or asset code %q", currency)
	}
	return Money{Minor: minor, Currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
	if m.Currency != other.Currency {
		return Money{}, ErrCurrencyMismatch
	}
	return Money{Minor: m.Minor + other.Minor, Currency: m.Currency}, nil
}

func (m Money) Negate() Money { return Money{Minor: -m.Minor, Currency: m.Currency} }
