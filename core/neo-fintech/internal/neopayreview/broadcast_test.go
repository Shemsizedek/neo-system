package neopayreview

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeBitcoinNode struct {
	validation NodeValidation
	validationErr error
	send NodeBroadcastResult
	sendErr error
	observation NodeObservation
	sendCalls int
}

func (n *fakeBitcoinNode) TestMempoolAccept(context.Context, string) (NodeValidation, error) { return n.validation, n.validationErr }
func (n *fakeBitcoinNode) SendRawTransaction(context.Context, string) (NodeBroadcastResult, error) { n.sendCalls++; return n.send, n.sendErr }
func (n *fakeBitcoinNode) LookupTransaction(context.Context, string) (NodeObservation, error) { return n.observation, nil }

type fakeBroadcastStore struct {
	validations map[string]ConsensusValidation
	authorizations map[string]BroadcastAuthorization
	attempts map[string]BroadcastAttempt
}

func newFakeBroadcastStore() *fakeBroadcastStore {
	return &fakeBroadcastStore{validations:map[string]ConsensusValidation{}, authorizations:map[string]BroadcastAuthorization{}, attempts:map[string]BroadcastAttempt{}}
}
func (s *fakeBroadcastStore) SaveConsensusValidation(_ context.Context, v ConsensusValidation) error { s.validations[v.ValidationID] = v; return nil }
func (s *fakeBroadcastStore) SaveValidatedBroadcastAuthorization(_ context.Context, a BroadcastAuthorization, v ConsensusValidation) error {
	if !v.Allowed { return errors.New("validation not allowed") }
	s.authorizations[a.AuthorizationID] = a
	return nil
}
func (s *fakeBroadcastStore) BeginBroadcastAttempt(_ context.Context, a BroadcastAttempt) (BroadcastAttempt, bool, error) {
	if existing, ok := s.attempts[a.AuthorizationID]; ok { return existing, false, nil }
	s.attempts[a.AuthorizationID] = a
	return a, true, nil
}
func (s *fakeBroadcastStore) UpdateBroadcastAttempt(_ context.Context, a BroadcastAttempt) error { s.attempts[a.AuthorizationID] = a; return nil }

func verifiedSignedFixture(t *testing.T) SignedVerification {
	t.Helper()
	r, a := approvedFixture(t)
	inspection := Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:25, FeeSats:700, StructureHash:"shape-1"}
	v, err := VerifySignedTransaction("v1", "checker", r, a, "cafebabe", inspection, time.Unix(3,0))
	if err != nil { t.Fatal(err) }
	return v
}

func TestConsensusRejectionBlocksBroadcastAuthorization(t *testing.T) {
	v := verifiedSignedFixture(t)
	node := &fakeBitcoinNode{validation:NodeValidation{TxID:"tx1", WTxID:"wtx1", Allowed:false, RejectReason:"mandatory-script-verify-flag-failed"}}
	store := newFakeBroadcastStore()
	svc := BroadcastService{Node:node, Store:store, Now:func() time.Time { return time.Unix(4,0) }}
	ctx := WithPrincipal(context.Background(), Principal{ID:"checker"})
	validation, err := svc.Validate(ctx, "cv1", v, "cafebabe")
	if err != nil { t.Fatal(err) }
	if validation.Allowed { t.Fatal("expected rejected node validation") }
	if _, err := svc.Authorize(ctx, "ba1", "release", v, validation); err == nil { t.Fatal("expected authorization rejection") }
}

func TestBroadcastAcceptsOnceAndReplaysStoredOutcome(t *testing.T) {
	v := verifiedSignedFixture(t)
	node := &fakeBitcoinNode{validation:NodeValidation{TxID:"tx1", WTxID:"wtx1", Allowed:true, VSize:150}, send:NodeBroadcastResult{TxID:"tx1", Outcome:BroadcastNodeAccepted}}
	store := newFakeBroadcastStore()
	svc := BroadcastService{Node:node, Store:store, Now:func() time.Time { return time.Unix(4,0) }}
	ctx := WithPrincipal(context.Background(), Principal{ID:"checker"})
	validation, err := svc.Validate(ctx, "cv1", v, "cafebabe"); if err != nil { t.Fatal(err) }
	auth, err := svc.Authorize(ctx, "ba1", "release", v, validation); if err != nil { t.Fatal(err) }
	attempt, replay, err := svc.Submit(ctx, "attempt1", "cafebabe", auth, validation); if err != nil { t.Fatal(err) }
	if replay || attempt.Status != BroadcastAttemptAccepted || node.sendCalls != 1 { t.Fatalf("unexpected first submission %+v replay=%v calls=%d", attempt, replay, node.sendCalls) }
	attempt, replay, err = svc.Submit(ctx, "attempt2", "cafebabe", auth, validation); if err != nil { t.Fatal(err) }
	if !replay || attempt.Status != BroadcastAttemptAccepted || node.sendCalls != 1 { t.Fatalf("duplicate submission was not replay-safe: %+v replay=%v calls=%d", attempt, replay, node.sendCalls) }
}

func TestAmbiguousBroadcastMustReconcileBeforeRetry(t *testing.T) {
	v := verifiedSignedFixture(t)
	node := &fakeBitcoinNode{validation:NodeValidation{TxID:"tx1", WTxID:"wtx1", Allowed:true}, sendErr:errors.New("connection reset"), observation:NodeObservation{TxID:"tx1", State:NodeObservedMempool}}
	store := newFakeBroadcastStore()
	svc := BroadcastService{Node:node, Store:store, Now:func() time.Time { return time.Unix(4,0) }}
	ctx := WithPrincipal(context.Background(), Principal{ID:"checker"})
	validation, _ := svc.Validate(ctx, "cv1", v, "cafebabe")
	auth, _ := svc.Authorize(ctx, "ba1", "release", v, validation)
	attempt, _, err := svc.Submit(ctx, "attempt1", "cafebabe", auth, validation)
	if err == nil || attempt.Status != BroadcastAttemptAmbiguous || node.sendCalls != 1 { t.Fatalf("expected ambiguous submission: %+v err=%v", attempt, err) }
	_, replay, err := svc.Submit(ctx, "attempt2", "cafebabe", auth, validation)
	if err == nil || !replay || node.sendCalls != 1 { t.Fatal("ambiguous replay should not resubmit") }
	resolved, err := svc.Reconcile(ctx, attempt); if err != nil { t.Fatal(err) }
	if resolved.Status != BroadcastAttemptAccepted { t.Fatalf("expected observed tx to resolve accepted: %+v", resolved) }
}
