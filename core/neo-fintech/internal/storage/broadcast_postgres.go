package storage

import (
	"context"
	"database/sql"
	"errors"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

func (s Store) SaveConsensusValidation(ctx context.Context, v neopayreview.ConsensusValidation) error {
	if s.DB == nil { return errors.New("nil database") }
	_, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_bitcoin_consensus_validations (
		validation_id, verification_id, review_id, approval_id, actor_id, signed_tx_hash,
		txid, wtxid, allowed, vsize, reject_reason, reject_details, validated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		v.ValidationID, v.VerificationID, v.ReviewID, v.ApprovalID, v.ActorID, v.SignedTxHash,
		v.TxID, v.WTxID, v.Allowed, v.VSize, v.RejectReason, v.RejectDetails, v.ValidatedAt)
	return err
}

// SaveValidatedBroadcastAuthorization atomically records the authority to submit
// only when the referenced Bitcoin Core validation was allowed and matches the
// same signed transaction and semantic verification.
func (s Store) SaveValidatedBroadcastAuthorization(ctx context.Context, a neopayreview.BroadcastAuthorization, v neopayreview.ConsensusValidation) error {
	if s.DB == nil { return errors.New("nil database") }
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return err }
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `INSERT INTO fintech_broadcast_authorizations (
		authorization_id, verification_id, validation_id, review_id, approval_id, actor_id, reason, signed_tx_hash, authorized_at
	) SELECT $1, sv.verification_id, cv.validation_id, sv.review_id, sv.approval_id, $6, $7, sv.signed_tx_hash, $9
	  FROM fintech_signed_transaction_verifications sv
	  JOIN fintech_bitcoin_consensus_validations cv ON cv.verification_id=sv.verification_id
	 WHERE sv.verification_id=$2 AND cv.validation_id=$3 AND sv.review_id=$4 AND sv.approval_id=$5
	   AND sv.signed_tx_hash=$8 AND cv.signed_tx_hash=$8 AND sv.status='verified' AND cv.allowed=true`,
		a.AuthorizationID, a.VerificationID, a.ValidationID, a.ReviewID, a.ApprovalID,
		a.ActorID, a.Reason, a.SignedTxHash, a.AuthorizedAt)
	if err != nil { return err }
	n, err := res.RowsAffected(); if err != nil { return err }
	if n != 1 { return errors.New("validated broadcast authorization preconditions not satisfied") }
	return tx.Commit()
}

// BeginBroadcastAttempt creates the durable provider attempt before the external
// sendrawtransaction call. Existing attempts are returned without re-submission.
func (s Store) BeginBroadcastAttempt(ctx context.Context, a neopayreview.BroadcastAttempt) (neopayreview.BroadcastAttempt, bool, error) {
	if s.DB == nil { return neopayreview.BroadcastAttempt{}, false, errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_broadcast_attempts (
		attempt_id, authorization_id, validation_id, actor_id, provider_operation_id,
		signed_tx_hash, status, reject_reason, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
		a.AttemptID, a.AuthorizationID, a.ValidationID, a.ActorID, a.ProviderOperationID,
		a.SignedTxHash, a.Status, a.RejectReason, a.CreatedAt, a.UpdatedAt)
	if err != nil { return neopayreview.BroadcastAttempt{}, false, err }
	n, err := res.RowsAffected(); if err != nil { return neopayreview.BroadcastAttempt{}, false, err }
	if n == 1 { return a, true, nil }
	var existing neopayreview.BroadcastAttempt
	var status string
	err = s.DB.QueryRowContext(ctx, `SELECT attempt_id, authorization_id, validation_id, actor_id,
		provider_operation_id, signed_tx_hash, status, COALESCE(reject_reason,''), created_at, updated_at
		FROM fintech_broadcast_attempts WHERE authorization_id=$1`, a.AuthorizationID).Scan(
		&existing.AttemptID, &existing.AuthorizationID, &existing.ValidationID, &existing.ActorID,
		&existing.ProviderOperationID, &existing.SignedTxHash, &status, &existing.RejectReason,
		&existing.CreatedAt, &existing.UpdatedAt)
	if err != nil { return neopayreview.BroadcastAttempt{}, false, err }
	existing.Status = neopayreview.BroadcastAttemptStatus(status)
	if existing.ValidationID != a.ValidationID || existing.ProviderOperationID != a.ProviderOperationID || existing.SignedTxHash != a.SignedTxHash {
		return neopayreview.BroadcastAttempt{}, false, errors.New("broadcast authorization reused with different transaction identity")
	}
	return existing, false, nil
}

func (s Store) UpdateBroadcastAttempt(ctx context.Context, a neopayreview.BroadcastAttempt) error {
	if s.DB == nil { return errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `UPDATE fintech_broadcast_attempts
		SET status=$1, reject_reason=$2, updated_at=$3
		WHERE attempt_id=$4 AND authorization_id=$5 AND validation_id=$6
		  AND provider_operation_id=$7 AND signed_tx_hash=$8`,
		a.Status, a.RejectReason, a.UpdatedAt, a.AttemptID, a.AuthorizationID, a.ValidationID,
		a.ProviderOperationID, a.SignedTxHash)
	if err != nil { return err }
	n, err := res.RowsAffected(); if err != nil { return err }
	if n != 1 { return errors.New("broadcast attempt identity mismatch") }
	return nil
}
