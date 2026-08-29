package neopayreview

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Intent is the exact payment instruction the user expects to sign.
// Quantity is expressed in exact Counterparty base units and FeeSats in satoshis.
type Intent struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Asset       string `json:"asset"`
	Quantity    int64  `json:"quantity"`
	FeeSats     int64  `json:"fee_sats"`
}

// Inspection is produced by a decoder that is independent from the compose response.
// Review approval is forbidden until this decoded result exactly matches Intent.
type Inspection struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Asset       string `json:"asset"`
	Quantity    int64  `json:"quantity"`
	FeeSats     int64  `json:"fee_sats"`
}

type Status string

const (
	StatusPending  Status = "pending_review"
	StatusVerified Status = "verified"
	StatusRejected Status = "rejected"
	StatusApproved Status = "approved_for_external_signing"
)

type Review struct {
	ReviewID       string     `json:"review_id"`
	OperationID    string     `json:"operation_id"`
	Intent         Intent     `json:"intent"`
	Inspection     Inspection `json:"inspection"`
	UnsignedTxHash string     `json:"unsigned_tx_hash"`
	Status         Status     `json:"status"`
	MismatchReason string     `json:"mismatch_reason,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type Approval struct {
	ApprovalID     string    `json:"approval_id"`
	ReviewID       string    `json:"review_id"`
	ActorID        string    `json:"actor_id"`
	Reason         string    `json:"reason"`
	ApprovedAt     time.Time `json:"approved_at"`
	UnsignedTxHash string    `json:"unsigned_tx_hash"`
}

func New(reviewID, operationID, unsignedTx string, intent Intent, inspection Inspection, at time.Time) (Review, error) {
	if strings.TrimSpace(reviewID) == "" || strings.TrimSpace(operationID) == "" {
		return Review{}, errors.New("review_id and operation_id are required")
	}
	if err := validateIntent(intent); err != nil {
		return Review{}, err
	}
	if strings.TrimSpace(unsignedTx) == "" {
		return Review{}, errors.New("unsigned transaction is required")
	}
	h := sha256.Sum256([]byte(strings.TrimSpace(unsignedTx)))
	r := Review{
		ReviewID: reviewID,
		OperationID: operationID,
		Intent: intent,
		Inspection: inspection,
		UnsignedTxHash: hex.EncodeToString(h[:]),
		Status: StatusPending,
		CreatedAt: at.UTC(),
	}
	if mismatch := compare(intent, inspection); mismatch != "" {
		r.Status = StatusRejected
		r.MismatchReason = mismatch
		return r, nil
	}
	r.Status = StatusVerified
	return r, nil
}

func (r Review) Approve(approvalID, actorID, reason, unsignedTx string, at time.Time) (Approval, Review, error) {
	if r.Status != StatusVerified {
		return Approval{}, r, fmt.Errorf("review status %s cannot be approved", r.Status)
	}
	if strings.TrimSpace(approvalID) == "" || strings.TrimSpace(actorID) == "" {
		return Approval{}, r, errors.New("approval_id and actor_id are required")
	}
	h := sha256.Sum256([]byte(strings.TrimSpace(unsignedTx)))
	hash := hex.EncodeToString(h[:])
	if hash != r.UnsignedTxHash {
		return Approval{}, r, errors.New("unsigned transaction changed after review")
	}
	a := Approval{ApprovalID: approvalID, ReviewID: r.ReviewID, ActorID: actorID, Reason: reason, ApprovedAt: at.UTC(), UnsignedTxHash: hash}
	r.Status = StatusApproved
	return a, r, nil
}

func validateIntent(i Intent) error {
	if strings.TrimSpace(i.Source) == "" || strings.TrimSpace(i.Destination) == "" {
		return errors.New("source and destination are required")
	}
	if strings.TrimSpace(i.Asset) == "" {
		return errors.New("asset is required")
	}
	if i.Quantity <= 0 {
		return errors.New("quantity must be positive exact base units")
	}
	if i.FeeSats < 0 {
		return errors.New("fee_sats cannot be negative")
	}
	return nil
}

func compare(i Intent, x Inspection) string {
	if i.Source != x.Source { return "source mismatch" }
	if i.Destination != x.Destination { return "destination mismatch" }
	if !strings.EqualFold(i.Asset, x.Asset) { return "asset mismatch" }
	if i.Quantity != x.Quantity { return "quantity mismatch" }
	if i.FeeSats != x.FeeSats { return "fee mismatch" }
	return ""
}
