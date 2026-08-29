package neopayreview

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type principalKey struct{}

type Principal struct { ID string }

func WithPrincipal(ctx context.Context, principal Principal) context.Context { return context.WithValue(ctx, principalKey{}, principal) }
func PrincipalFromContext(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(Principal)
	if !ok || strings.TrimSpace(p.ID) == "" { return Principal{}, false }
	return p, true
}

type OperationIdentity struct {
	PrincipalID string
	Operation string
	TargetID string
	IdempotencyKey string
	Fingerprint string
}

type OperationResult struct {
	Review Review
	Approval Approval
	Exists bool
}

type OperationRegistry interface {
	Claim(context.Context, OperationIdentity) (OperationResult, bool, error)
	CompleteReview(context.Context, OperationIdentity, Review) error
	CompleteApproval(context.Context, OperationIdentity, Approval, Review) error
}

func ReviewOperationIdentity(principalID, idempotencyKey, reviewID, operationID string, intent Intent) (OperationIdentity, error) {
	if strings.TrimSpace(principalID) == "" || strings.TrimSpace(idempotencyKey) == "" { return OperationIdentity{}, errors.New("principal and idempotency key are required") }
	canonical, err := json.Marshal(struct { OperationID string `json:"operation_id"`; Intent Intent `json:"intent"` }{operationID, intent})
	if err != nil { return OperationIdentity{}, err }
	h := sha256.Sum256(canonical)
	return OperationIdentity{PrincipalID:principalID, Operation:"neopay_review", TargetID:reviewID, IdempotencyKey:idempotencyKey, Fingerprint:hex.EncodeToString(h[:])}, nil
}

func ApprovalOperationIdentity(principalID, idempotencyKey string, review Review, approvalID, reason string) (OperationIdentity, error) {
	if strings.TrimSpace(principalID) == "" || strings.TrimSpace(idempotencyKey) == "" { return OperationIdentity{}, errors.New("principal and idempotency key are required") }
	canonical, err := json.Marshal(struct { ReviewID string `json:"review_id"`; ApprovalID string `json:"approval_id"`; UnsignedTxHash string `json:"unsigned_tx_hash"`; Reason string `json:"reason"` }{review.ReviewID, approvalID, review.UnsignedTxHash, reason})
	if err != nil { return OperationIdentity{}, err }
	h := sha256.Sum256(canonical)
	return OperationIdentity{PrincipalID:principalID, Operation:"neopay_approval", TargetID:review.ReviewID, IdempotencyKey:idempotencyKey, Fingerprint:hex.EncodeToString(h[:])}, nil
}

func PrepareAuthenticated(ctx context.Context, registry OperationRegistry, service Service, reviewID, operationID string, intent Intent, idempotencyKey string) (Review, string, bool, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return Review{}, "", false, errors.New("authenticated principal required") }
	if registry == nil { return Review{}, "", false, errors.New("operation registry is not configured") }
	identity, err := ReviewOperationIdentity(principal.ID, idempotencyKey, reviewID, operationID, intent)
	if err != nil { return Review{}, "", false, err }
	existing, claimed, err := registry.Claim(ctx, identity)
	if err != nil { return Review{}, "", false, err }
	if !claimed {
		if !existing.Exists || existing.Review.ReviewID == "" { return Review{}, "", false, errors.New("idempotent review is still processing") }
		return existing.Review, "", true, nil
	}
	review, unsignedTx, err := service.Prepare(ctx, reviewID, operationID, intent)
	if err != nil { return Review{}, "", false, err }
	if err := registry.CompleteReview(ctx, identity, review); err != nil { return Review{}, "", false, err }
	return review, unsignedTx, false, nil
}

func ApproveVerified(ctx context.Context, registry OperationRegistry, review Review, approvalID, reason, unsignedTx, idempotencyKey string, now func() time.Time) (Approval, Review, bool, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return Approval{}, review, false, errors.New("authenticated principal required") }
	if registry == nil { return Approval{}, review, false, errors.New("operation registry is not configured") }
	identity, err := ApprovalOperationIdentity(principal.ID, idempotencyKey, review, approvalID, reason)
	if err != nil { return Approval{}, review, false, err }
	existing, claimed, err := registry.Claim(ctx, identity)
	if err != nil { return Approval{}, review, false, err }
	if !claimed {
		if !existing.Exists || existing.Approval.ApprovalID == "" { return Approval{}, review, false, errors.New("idempotent approval is still processing") }
		return existing.Approval, existing.Review, true, nil
	}
	clock := time.Now
	if now != nil { clock = now }
	approval, updated, err := review.Approve(approvalID, principal.ID, reason, unsignedTx, clock())
	if err != nil { return Approval{}, review, false, err }
	if err := registry.CompleteApproval(ctx, identity, approval, updated); err != nil { return Approval{}, review, false, err }
	return approval, updated, false, nil
}
