package neopayreview

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

type SignedVerificationStatus string

const (
	SignedVerificationVerified SignedVerificationStatus = "verified"
	SignedVerificationRejected SignedVerificationStatus = "rejected"
)

type SignedVerification struct {
	VerificationID       string                   `json:"verification_id"`
	ReviewID             string                   `json:"review_id"`
	ApprovalID           string                   `json:"approval_id"`
	ActorID              string                   `json:"actor_id"`
	SignedTxHash         string                   `json:"signed_tx_hash"`
	UnsignedStructureHash string                  `json:"unsigned_structure_hash"`
	SignedStructureHash  string                   `json:"signed_structure_hash"`
	Inspection           Inspection               `json:"inspection"`
	Status               SignedVerificationStatus `json:"status"`
	MismatchReason       string                   `json:"mismatch_reason,omitempty"`
	VerifiedAt           time.Time                `json:"verified_at"`
}

type BroadcastAuthorization struct {
	AuthorizationID string    `json:"authorization_id"`
	VerificationID  string    `json:"verification_id"`
	ReviewID        string    `json:"review_id"`
	ApprovalID      string    `json:"approval_id"`
	ActorID         string    `json:"actor_id"`
	Reason          string    `json:"reason"`
	SignedTxHash    string    `json:"signed_tx_hash"`
	AuthorizedAt    time.Time `json:"authorized_at"`
}

// VerifySignedTransaction rechecks the externally signed transaction against
// both the approved payment semantics and a signature-independent transaction
// structure hash. It does not verify cryptographic signatures and does not
// broadcast; those are separate trust boundaries.
func VerifySignedTransaction(verificationID, actorID string, review Review, approval Approval, signedTx string, inspection Inspection, at time.Time) (SignedVerification, error) {
	if strings.TrimSpace(verificationID) == "" || strings.TrimSpace(actorID) == "" {
		return SignedVerification{}, errors.New("verification_id and actor_id are required")
	}
	if review.Status != StatusApproved { return SignedVerification{}, errors.New("review is not approved for external signing") }
	if approval.ReviewID != review.ReviewID || approval.UnsignedTxHash != review.UnsignedTxHash {
		return SignedVerification{}, errors.New("approval does not bind to reviewed unsigned transaction")
	}
	if strings.TrimSpace(signedTx) == "" { return SignedVerification{}, errors.New("signed transaction is required") }
	if strings.TrimSpace(review.Inspection.StructureHash) == "" || strings.TrimSpace(inspection.StructureHash) == "" {
		return SignedVerification{}, errors.New("signature-independent transaction structure hash is required")
	}
	h := sha256.Sum256([]byte(strings.TrimSpace(signedTx)))
	v := SignedVerification{
		VerificationID: verificationID, ReviewID: review.ReviewID, ApprovalID: approval.ApprovalID,
		ActorID: actorID, SignedTxHash: hex.EncodeToString(h[:]),
		UnsignedStructureHash: review.Inspection.StructureHash, SignedStructureHash: inspection.StructureHash,
		Inspection: inspection, Status: SignedVerificationVerified, VerifiedAt: at.UTC(),
	}
	if mismatch := compare(review.Intent, inspection); mismatch != "" {
		v.Status = SignedVerificationRejected
		v.MismatchReason = mismatch
		return v, nil
	}
	if inspection.StructureHash != review.Inspection.StructureHash {
		v.Status = SignedVerificationRejected
		v.MismatchReason = "transaction structure changed after signing"
		return v, nil
	}
	return v, nil
}

func (v SignedVerification) AuthorizeBroadcast(authorizationID, actorID, reason string, at time.Time) (BroadcastAuthorization, error) {
	if v.Status != SignedVerificationVerified { return BroadcastAuthorization{}, errors.New("signed transaction is not verified") }
	if strings.TrimSpace(authorizationID) == "" || strings.TrimSpace(actorID) == "" { return BroadcastAuthorization{}, errors.New("authorization_id and actor_id are required") }
	return BroadcastAuthorization{
		AuthorizationID: authorizationID, VerificationID: v.VerificationID, ReviewID: v.ReviewID,
		ApprovalID: v.ApprovalID, ActorID: actorID, Reason: reason, SignedTxHash: v.SignedTxHash,
		AuthorizedAt: at.UTC(),
	}, nil
}
