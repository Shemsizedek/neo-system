package neopayreview

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

type NodeValidation struct {
	TxID          string `json:"txid"`
	WTxID         string `json:"wtxid"`
	Allowed       bool   `json:"allowed"`
	VSize         int64  `json:"vsize"`
	RejectReason  string `json:"reject_reason,omitempty"`
	RejectDetails string `json:"reject_details,omitempty"`
}

type ConsensusValidation struct {
	ValidationID   string    `json:"validation_id"`
	VerificationID string    `json:"verification_id"`
	ReviewID       string    `json:"review_id"`
	ApprovalID     string    `json:"approval_id"`
	ActorID        string    `json:"actor_id"`
	SignedTxHash   string    `json:"signed_tx_hash"`
	TxID           string    `json:"txid"`
	WTxID          string    `json:"wtxid"`
	Allowed        bool      `json:"allowed"`
	VSize          int64     `json:"vsize"`
	RejectReason   string    `json:"reject_reason,omitempty"`
	RejectDetails  string    `json:"reject_details,omitempty"`
	ValidatedAt    time.Time `json:"validated_at"`
}

type BroadcastNodeOutcome string

const (
	BroadcastNodeAccepted BroadcastNodeOutcome = "accepted"
	BroadcastNodeRejected BroadcastNodeOutcome = "rejected"
)

type NodeBroadcastResult struct {
	TxID         string               `json:"txid,omitempty"`
	Outcome      BroadcastNodeOutcome `json:"outcome"`
	RejectReason string               `json:"reject_reason,omitempty"`
}

type NodeObservationState string

const (
	NodeObservedMempool        NodeObservationState = "mempool"
	NodeObservedChainOrMempool NodeObservationState = "chain_or_mempool"
	NodeObservationUnknown     NodeObservationState = "unknown"
)

type NodeObservation struct {
	TxID  string               `json:"txid"`
	State NodeObservationState `json:"state"`
}

type BitcoinNode interface {
	TestMempoolAccept(context.Context, string) (NodeValidation, error)
	SendRawTransaction(context.Context, string) (NodeBroadcastResult, error)
	LookupTransaction(context.Context, string) (NodeObservation, error)
}

type BroadcastAttemptStatus string

const (
	BroadcastAttemptPrepared  BroadcastAttemptStatus = "prepared"
	BroadcastAttemptAccepted  BroadcastAttemptStatus = "accepted"
	BroadcastAttemptRejected  BroadcastAttemptStatus = "rejected"
	BroadcastAttemptAmbiguous BroadcastAttemptStatus = "ambiguous"
)

type BroadcastAttempt struct {
	AttemptID           string                 `json:"attempt_id"`
	AuthorizationID     string                 `json:"authorization_id"`
	ValidationID        string                 `json:"validation_id"`
	ActorID             string                 `json:"actor_id"`
	ProviderOperationID string                 `json:"provider_operation_id"`
	SignedTxHash        string                 `json:"signed_tx_hash"`
	Status              BroadcastAttemptStatus `json:"status"`
	RejectReason        string                 `json:"reject_reason,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

type BroadcastStore interface {
	SaveConsensusValidation(context.Context, ConsensusValidation) error
	SaveValidatedBroadcastAuthorization(context.Context, BroadcastAuthorization, ConsensusValidation) error
	BeginBroadcastAttempt(context.Context, BroadcastAttempt) (BroadcastAttempt, bool, error)
	UpdateBroadcastAttempt(context.Context, BroadcastAttempt) error
}

type BroadcastService struct {
	Node   BitcoinNode
	Store  BroadcastStore
	Now    func() time.Time
}

func (s BroadcastService) Validate(ctx context.Context, validationID string, verification SignedVerification, signedTx string) (ConsensusValidation, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return ConsensusValidation{}, errors.New("authenticated principal required") }
	if s.Node == nil || s.Store == nil { return ConsensusValidation{}, errors.New("broadcast validation dependencies are not configured") }
	if verification.Status != SignedVerificationVerified { return ConsensusValidation{}, errors.New("signed transaction semantic verification is not verified") }
	if strings.TrimSpace(validationID) == "" || strings.TrimSpace(signedTx) == "" { return ConsensusValidation{}, errors.New("validation_id and signed transaction are required") }
	h := sha256.Sum256([]byte(strings.TrimSpace(signedTx)))
	signedHash := hex.EncodeToString(h[:])
	if signedHash != verification.SignedTxHash { return ConsensusValidation{}, errors.New("signed transaction bytes do not match verified transaction") }
	result, err := s.Node.TestMempoolAccept(ctx, signedTx)
	if err != nil { return ConsensusValidation{}, err }
	if strings.TrimSpace(result.TxID) == "" { return ConsensusValidation{}, errors.New("Bitcoin Core validation did not return txid") }
	clock := time.Now
	if s.Now != nil { clock = s.Now }
	validation := ConsensusValidation{
		ValidationID:validationID, VerificationID:verification.VerificationID, ReviewID:verification.ReviewID,
		ApprovalID:verification.ApprovalID, ActorID:principal.ID, SignedTxHash:signedHash,
		TxID:result.TxID, WTxID:result.WTxID, Allowed:result.Allowed, VSize:result.VSize,
		RejectReason:result.RejectReason, RejectDetails:result.RejectDetails, ValidatedAt:clock().UTC(),
	}
	if err := s.Store.SaveConsensusValidation(ctx, validation); err != nil { return ConsensusValidation{}, err }
	return validation, nil
}

func (s BroadcastService) Authorize(ctx context.Context, authorizationID, reason string, verification SignedVerification, validation ConsensusValidation) (BroadcastAuthorization, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return BroadcastAuthorization{}, errors.New("authenticated principal required") }
	if s.Store == nil { return BroadcastAuthorization{}, errors.New("broadcast store is not configured") }
	if !validation.Allowed { return BroadcastAuthorization{}, errors.New("Bitcoin Core did not accept transaction under consensus/policy validation") }
	if validation.VerificationID != verification.VerificationID || validation.SignedTxHash != verification.SignedTxHash {
		return BroadcastAuthorization{}, errors.New("consensus validation does not bind to signed verification")
	}
	clock := time.Now
	if s.Now != nil { clock = s.Now }
	authorization, err := verification.authorizeValidatedBroadcast(authorizationID, validation.ValidationID, principal.ID, reason, clock())
	if err != nil { return BroadcastAuthorization{}, err }
	if err := s.Store.SaveValidatedBroadcastAuthorization(ctx, authorization, validation); err != nil { return BroadcastAuthorization{}, err }
	return authorization, nil
}

func (s BroadcastService) Submit(ctx context.Context, attemptID, signedTx string, authorization BroadcastAuthorization, validation ConsensusValidation) (BroadcastAttempt, bool, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok { return BroadcastAttempt{}, false, errors.New("authenticated principal required") }
	if s.Node == nil || s.Store == nil { return BroadcastAttempt{}, false, errors.New("broadcast dependencies are not configured") }
	if strings.TrimSpace(attemptID) == "" || strings.TrimSpace(signedTx) == "" { return BroadcastAttempt{}, false, errors.New("attempt_id and signed transaction are required") }
	if authorization.ValidationID != validation.ValidationID || authorization.SignedTxHash != validation.SignedTxHash || !validation.Allowed {
		return BroadcastAttempt{}, false, errors.New("broadcast authorization is not backed by allowed consensus validation")
	}
	h := sha256.Sum256([]byte(strings.TrimSpace(signedTx)))
	if hex.EncodeToString(h[:]) != authorization.SignedTxHash { return BroadcastAttempt{}, false, errors.New("signed transaction changed after broadcast authorization") }
	clock := time.Now
	if s.Now != nil { clock = s.Now }
	now := clock().UTC()
	attempt := BroadcastAttempt{AttemptID:attemptID, AuthorizationID:authorization.AuthorizationID, ValidationID:validation.ValidationID, ActorID:principal.ID, ProviderOperationID:validation.TxID, SignedTxHash:authorization.SignedTxHash, Status:BroadcastAttemptPrepared, CreatedAt:now, UpdatedAt:now}
	existing, claimed, err := s.Store.BeginBroadcastAttempt(ctx, attempt)
	if err != nil { return BroadcastAttempt{}, false, err }
	if !claimed {
		switch existing.Status {
		case BroadcastAttemptAccepted:
			return existing, true, nil
		case BroadcastAttemptAmbiguous:
			return existing, true, errors.New("previous broadcast outcome is ambiguous; reconcile before retry")
		case BroadcastAttemptPrepared:
			return existing, true, errors.New("broadcast attempt is already processing")
		default:
			return existing, true, errors.New("previous broadcast attempt was rejected")
		}
	}
	result, err := s.Node.SendRawTransaction(ctx, signedTx)
	attempt.UpdatedAt = clock().UTC()
	if err != nil {
		attempt.Status = BroadcastAttemptAmbiguous
		attempt.RejectReason = "provider outcome unknown after submission attempt"
		if saveErr := s.Store.UpdateBroadcastAttempt(ctx, attempt); saveErr != nil { return BroadcastAttempt{}, false, saveErr }
		return attempt, false, err
	}
	if result.Outcome == BroadcastNodeAccepted {
		if result.TxID != "" && result.TxID != validation.TxID { return BroadcastAttempt{}, false, errors.New("Bitcoin Core returned unexpected txid") }
		attempt.Status = BroadcastAttemptAccepted
	} else {
		attempt.Status = BroadcastAttemptRejected
		attempt.RejectReason = result.RejectReason
	}
	if err := s.Store.UpdateBroadcastAttempt(ctx, attempt); err != nil { return BroadcastAttempt{}, false, err }
	return attempt, false, nil
}

func (s BroadcastService) Reconcile(ctx context.Context, attempt BroadcastAttempt) (BroadcastAttempt, error) {
	if s.Node == nil || s.Store == nil { return BroadcastAttempt{}, errors.New("broadcast dependencies are not configured") }
	if attempt.Status != BroadcastAttemptAmbiguous { return attempt, nil }
	observation, err := s.Node.LookupTransaction(ctx, attempt.ProviderOperationID)
	if err != nil { return attempt, err }
	if observation.State == NodeObservedMempool || observation.State == NodeObservedChainOrMempool {
		attempt.Status = BroadcastAttemptAccepted
		attempt.RejectReason = ""
		clock := time.Now
		if s.Now != nil { clock = s.Now }
		attempt.UpdatedAt = clock().UTC()
		if err := s.Store.UpdateBroadcastAttempt(ctx, attempt); err != nil { return BroadcastAttempt{}, err }
	}
	return attempt, nil
}
