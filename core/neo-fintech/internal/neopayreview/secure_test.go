package neopayreview

import (
	"context"
	"errors"
	"testing"
	"time"
)

type memoryRegistry struct {
	identity OperationIdentity
	result OperationResult
	claimed bool
}

func (m *memoryRegistry) Claim(_ context.Context, id OperationIdentity) (OperationResult, bool, error) {
	if !m.claimed {
		m.identity = id
		m.claimed = true
		return OperationResult{}, true, nil
	}
	if m.identity.PrincipalID != id.PrincipalID || m.identity.Operation != id.Operation || m.identity.TargetID != id.TargetID || m.identity.IdempotencyKey != id.IdempotencyKey {
		return OperationResult{}, false, errors.New("idempotency scope mismatch")
	}
	if m.identity.Fingerprint != id.Fingerprint {
		return OperationResult{}, false, errors.New("idempotency key reused with different semantic input")
	}
	return m.result, false, nil
}
func (m *memoryRegistry) CompleteReview(_ context.Context, _ OperationIdentity, r Review) error { m.result = OperationResult{Review:r, Exists:true}; return nil }
func (m *memoryRegistry) CompleteApproval(_ context.Context, _ OperationIdentity, a Approval, r Review) error { m.result = OperationResult{Review:r, Approval:a, Exists:true}; return nil }

func verifiedReview(t *testing.T) (Review, string) {
	t.Helper()
	tx := "deadbeef"
	r, err := New("r1", "op1", tx, Intent{Source:"src", Destination:"dst", Asset:"XCP", Quantity:5, FeeSats:10}, Inspection{Source:"src", Destination:"dst", Asset:"XCP", Quantity:5, FeeSats:10}, time.Unix(1,0))
	if err != nil { t.Fatal(err) }
	return r, tx
}

func TestApproveVerifiedRequiresPrincipal(t *testing.T) {
	r, tx := verifiedReview(t)
	_, _, _, err := ApproveVerified(context.Background(), &memoryRegistry{}, r, "a1", "ok", tx, "key1", nil)
	if err == nil { t.Fatal("expected authentication failure") }
}

func TestApproveVerifiedReplaysSameOutcome(t *testing.T) {
	r, tx := verifiedReview(t)
	registry := &memoryRegistry{}
	ctx := WithPrincipal(context.Background(), Principal{ID:"user-1"})
	a1, r1, replay, err := ApproveVerified(ctx, registry, r, "a1", "reviewed", tx, "key1", func() time.Time { return time.Unix(2,0) })
	if err != nil || replay { t.Fatalf("first approval failed: replay=%v err=%v", replay, err) }
	a2, r2, replay, err := ApproveVerified(ctx, registry, r, "a1", "reviewed", tx, "key1", func() time.Time { return time.Unix(3,0) })
	if err != nil || !replay { t.Fatalf("replay failed: replay=%v err=%v", replay, err) }
	if a1.ApprovalID != a2.ApprovalID || r1.Status != r2.Status { t.Fatal("replay returned different outcome") }
}

func TestApproveVerifiedRejectsSameKeyDifferentInput(t *testing.T) {
	r, tx := verifiedReview(t)
	registry := &memoryRegistry{}
	ctx := WithPrincipal(context.Background(), Principal{ID:"user-1"})
	if _, _, _, err := ApproveVerified(ctx, registry, r, "a1", "reviewed", tx, "key1", nil); err != nil { t.Fatal(err) }
	if _, _, _, err := ApproveVerified(ctx, registry, r, "a1", "changed reason", tx, "key1", nil); err == nil { t.Fatal("expected fingerprint mismatch rejection") }
}
