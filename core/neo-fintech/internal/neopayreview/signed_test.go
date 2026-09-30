package neopayreview

import (
	"testing"
	"time"
)

func approvedFixture(t *testing.T) (Review, Approval) {
	t.Helper()
	intent := Intent{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700}
	inspection := Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700, StructureHash:"shape-1"}
	r, err := New("r1", "op1", "deadbeef", intent, inspection, time.Unix(1,0)); if err != nil { t.Fatal(err) }
	a, updated, err := r.Approve("a1", "maker", "approved", "deadbeef", time.Unix(2,0)); if err != nil { t.Fatal(err) }
	return updated, a
}

func TestVerifySignedTransactionAcceptsSameSemanticsAndShape(t *testing.T) {
	r, a := approvedFixture(t)
	inspection := Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700, StructureHash:"shape-1"}
	v, err := VerifySignedTransaction("v1", "checker", r, a, "cafebabe", inspection, time.Unix(3,0))
	if err != nil { t.Fatal(err) }
	if v.Status != SignedVerificationVerified { t.Fatalf("unexpected status %s: %s", v.Status, v.MismatchReason) }
	if v.SignedTxHash == "" { t.Fatal("signed tx hash missing") }
}

func TestVerifySignedTransactionRejectsChangedOutputShape(t *testing.T) {
	r, a := approvedFixture(t)
	inspection := Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700, StructureHash:"shape-evil"}
	v, err := VerifySignedTransaction("v2", "checker", r, a, "cafebabe", inspection, time.Unix(3,0))
	if err != nil { t.Fatal(err) }
	if v.Status != SignedVerificationRejected || v.MismatchReason != "transaction structure changed after signing" { t.Fatalf("unexpected result %+v", v) }
}

func TestVerifySignedTransactionRejectsSemanticMutation(t *testing.T) {
	r, a := approvedFixture(t)
	inspection := Inspection{Source:"src", Destination:"attacker", Asset:"XCP", Quantity:25, FeeSats:700, StructureHash:"shape-1"}
	v, err := VerifySignedTransaction("v3", "checker", r, a, "cafebabe", inspection, time.Unix(3,0))
	if err != nil { t.Fatal(err) }
	if v.Status != SignedVerificationRejected || v.MismatchReason != "destination mismatch" { t.Fatalf("unexpected result %+v", v) }
}

func TestVerifySignedTransactionFailsClosedWithoutShape(t *testing.T) {
	r, a := approvedFixture(t)
	r.Inspection.StructureHash = ""
	if _, err := VerifySignedTransaction("v4", "checker", r, a, "cafebabe", Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700}, time.Unix(3,0)); err == nil { t.Fatal("expected missing structure hash error") }
}

func TestLegacyBroadcastAuthorizationFailsClosed(t *testing.T) {
	v := SignedVerification{VerificationID:"v1", ReviewID:"r1", ApprovalID:"a1", SignedTxHash:"signed", Status:SignedVerificationVerified}
	if _, err := v.AuthorizeBroadcast("b1", "checker", "release", time.Unix(4,0)); err == nil {
		t.Fatal("expected Bitcoin Core validation requirement")
	}
}
