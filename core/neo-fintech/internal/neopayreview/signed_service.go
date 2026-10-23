package neopayreview

import (
	"context"
	"errors"
	"time"
)

type ApprovedReviewLoader interface {
	LoadApprovedReview(context.Context, string) (Review, Approval, error)
}

type SignedEvidenceWriter interface {
	SaveSignedVerification(context.Context, SignedVerification) error
	SaveBroadcastAuthorization(context.Context, BroadcastAuthorization) error
}

type SignedService struct {
	Inspect InspectFunc
	Loader  ApprovedReviewLoader
	Writer  SignedEvidenceWriter
	Now     func() time.Time
}

// Verify loads the authoritative approved review, independently reinspects the
// externally signed bytes, and persists either verified or rejected evidence.
func (s SignedService) Verify(ctx context.Context, verificationID, reviewID, signedTx string) (SignedVerification, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return SignedVerification{}, errors.New("authenticated principal required") }
	if s.Inspect == nil || s.Loader == nil || s.Writer == nil { return SignedVerification{}, errors.New("signed verification dependencies are not configured") }
	review, approval, err := s.Loader.LoadApprovedReview(ctx, reviewID)
	if err != nil { return SignedVerification{}, err }
	inspection, err := s.Inspect(ctx, signedTx)
	if err != nil { return SignedVerification{}, err }
	clock := time.Now
	if s.Now != nil { clock = s.Now }
	verification, err := VerifySignedTransaction(verificationID, principal.ID, review, approval, signedTx, inspection, clock())
	if err != nil { return SignedVerification{}, err }
	if err := s.Writer.SaveSignedVerification(ctx, verification); err != nil { return SignedVerification{}, err }
	return verification, nil
}

func (s SignedService) AuthorizeBroadcast(ctx context.Context, verification SignedVerification, authorizationID, reason string) (BroadcastAuthorization, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return BroadcastAuthorization{}, errors.New("authenticated principal required") }
	if s.Writer == nil { return BroadcastAuthorization{}, errors.New("signed evidence writer is not configured") }
	clock := time.Now
	if s.Now != nil { clock = s.Now }
	authorization, err := verification.AuthorizeBroadcast(authorizationID, principal.ID, reason, clock())
	if err != nil { return BroadcastAuthorization{}, err }
	if err := s.Writer.SaveBroadcastAuthorization(ctx, authorization); err != nil { return BroadcastAuthorization{}, err }
	return authorization, nil
}
