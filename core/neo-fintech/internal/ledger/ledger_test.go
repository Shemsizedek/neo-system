package ledger

import (
	"testing"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/money"
)

func TestBalancedJournalAndReversal(t *testing.T) {
	usd, _ := money.New(1250, "USD")
	j := Journal{ID: "j1", OperationID: "op1", Entries: []Entry{{Account: "cash", Amount: usd}, {Account: "receivable", Amount: usd.Negate()}}}
	if err := Validate(j); err != nil { t.Fatal(err) }
	r := Reverse(j, "j2", "op2", "correction", time.Now().UTC())
	if err := Validate(r); err != nil { t.Fatal(err) }
}

func TestRejectUnbalanced(t *testing.T) {
	usd, _ := money.New(1250, "USD")
	j := Journal{ID: "j1", OperationID: "op1", Entries: []Entry{{Account: "cash", Amount: usd}, {Account: "receivable", Amount: money.Money{Minor: -1200, Currency: "USD"}}}}
	if err := Validate(j); err == nil { t.Fatal("expected unbalanced journal rejection") }
}
