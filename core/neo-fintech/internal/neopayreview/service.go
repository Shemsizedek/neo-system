package neopayreview

import (
	"context"
	"errors"
	"strings"
	"time"
)

// ComposeFunc creates unsigned transaction bytes from the user's exact intent.
// It must not sign or broadcast.
type ComposeFunc func(context.Context, Intent) (string, error)

// InspectFunc independently decodes the unsigned transaction bytes. A production
// deployment should back this with a decoder/provider path separate from trusting
// the compose request/response fields themselves.
type InspectFunc func(context.Context, string) (Inspection, error)

type ReviewWriter interface {
	SaveTransactionReview(context.Context, Review) error
}

type Service struct {
	Compose ComposeFunc
	Inspect InspectFunc
	Writer  ReviewWriter
	Now     func() time.Time
}

func (s Service) Prepare(ctx context.Context, reviewID, operationID string, intent Intent) (Review, string, error) {
	if s.Compose == nil {
		return Review{}, "", errors.New("transaction composer is not configured")
	}
	if s.Inspect == nil {
		return Review{}, "", errors.New("independent transaction inspector is not configured")
	}
	if s.Writer == nil {
		return Review{}, "", errors.New("review evidence writer is not configured")
	}
	unsignedTx, err := s.Compose(ctx, intent)
	if err != nil {
		return Review{}, "", err
	}
	if strings.TrimSpace(unsignedTx) == "" {
		return Review{}, "", errors.New("composer returned empty unsigned transaction")
	}
	inspection, err := s.Inspect(ctx, unsignedTx)
	if err != nil {
		return Review{}, "", err
	}
	now := time.Now
	if s.Now != nil { now = s.Now }
	review, err := New(reviewID, operationID, unsignedTx, intent, inspection, now())
	if err != nil {
		return Review{}, "", err
	}
	// Persist both successful verification and mismatch evidence. A mismatch is
	// financially relevant evidence and should not disappear as a request error.
	if err := s.Writer.SaveTransactionReview(ctx, review); err != nil {
		return Review{}, "", err
	}
	return review, unsignedTx, nil
}
