package neopayreview

import (
	"strings"
	"testing"
	"time"
)

func TestReviewApprovesOnlyExactDecodedIntent(t *testing.T) {
	intent := Intent{Source: "src", Destination: "dst", Asset: "XCP", Quantity: 100, FeeSats: 1200}
	inspection := Inspection{Source: "src", Destination: "dst", Asset: "xcp", Quantity: 100, FeeSats: 1200}
	unsigned := "deadbeef"
	r, err := New("r1", "op1", unsigned, intent, inspection, time.Now())
	if err != nil { t.Fatal(err) }
	if r.Status != StatusVerified { t.Fatalf("expected verified, got %s", r.Status) }
	_, updated, err := r.Approve("a1", "user-1", "user confirmed decoded transaction", unsigned, time.Now())
	if err != nil { t.Fatal(err) }
	if updated.Status != StatusApproved { t.Fatalf("expected approved, got %s", updated.Status) }
}

func TestReviewRejectsDestinationMismatch(t *testing.T) {
	intent := Intent{Source: "src", Destination: "dst", Asset: "XCP", Quantity: 100, FeeSats: 1200}
	inspection := Inspection{Source: "src", Destination: "evil", Asset: "XCP", Quantity: 100, FeeSats: 1200}
	r, err := New("r2", "op2", "deadbeef", intent, inspection, time.Now())
	if err != nil { t.Fatal(err) }
	if r.Status != StatusRejected || r.MismatchReason != "destination mismatch" { t.Fatalf("unexpected review: %+v", r) }
	if _, _, err := r.Approve("a2", "user-1", "", "deadbeef", time.Now()); err == nil { t.Fatal("rejected review must not be approvable") }
}

func TestApprovalRejectsChangedUnsignedTransaction(t *testing.T) {
	intent := Intent{Source: "src", Destination: "dst", Asset: "XCP", Quantity: 100, FeeSats: 1200}
	inspection := Inspection{Source: "src", Destination: "dst", Asset: "XCP", Quantity: 100, FeeSats: 1200}
	r, err := New("r3", "op3", "deadbeef", intent, inspection, time.Now())
	if err != nil { t.Fatal(err) }
	_, _, err = r.Approve("a3", "user-1", "", strings.Repeat("a", 8), time.Now())
	if err == nil { t.Fatal("changed unsigned transaction must be rejected") }
}
