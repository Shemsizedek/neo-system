package reconciliation

import "testing"

func TestValidateMatch(t *testing.T) {
	m := Match{InternalIDs: []string{"i1"}, ExternalIDs: []string{"e1"}, Currency: "BTC", InternalMinor: 100, ExternalMinor: 100}
	if err := ValidateMatch(m); err != nil { t.Fatal(err) }
	m.ExternalMinor = 99
	if err := ValidateMatch(m); err == nil { t.Fatal("expected amount mismatch") }
}
