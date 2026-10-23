package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/idempotency"
	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/ledger"
	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

type Store struct { DB *sql.DB }

func (s Store) SaveJournal(ctx context.Context, j ledger.Journal) error {
	if s.DB == nil { return errors.New("nil database") }
	if err := ledger.Validate(j); err != nil { return err }
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return err }
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, `INSERT INTO fintech_journals (journal_id, operation_id, reason, recorded_at) VALUES ($1,$2,$3,$4)`, j.ID, j.OperationID, j.Reason, j.RecordedAt); err != nil { return err }
	for i, e := range j.Entries {
		if _, err = tx.ExecContext(ctx, `INSERT INTO fintech_journal_entries (journal_id, entry_no, account, currency, minor_units, recorded_at) VALUES ($1,$2,$3,$4,$5,$6)`, j.ID, i, e.Account, e.Amount.Currency, e.Amount.Minor, e.RecordedAt); err != nil { return err }
	}
	return tx.Commit()
}

func (s Store) ClaimIdempotency(ctx context.Context, r idempotency.Record) (bool, error) {
	if s.DB == nil { return false, errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_idempotency (principal_id, operation, target_id, idempotency_key, fingerprint, provider_operation_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, r.PrincipalID, r.Operation, r.TargetID, r.Key, r.Fingerprint, r.ProviderOperationID, r.Status)
	if err != nil { return false, err }
	n, err := res.RowsAffected()
	if err != nil { return false, fmt.Errorf("rows affected: %w", err) }
	return n == 1, nil
}

func (s Store) SaveTransactionReview(ctx context.Context, r neopayreview.Review) error {
	if s.DB == nil { return errors.New("nil database") }
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO fintech_transaction_reviews (
			review_id, operation_id, source_ref, destination_ref, asset,
			quantity_base_units, fee_sats, decoded_source_ref, decoded_destination_ref,
			decoded_asset, decoded_quantity_base_units, decoded_fee_sats,
			unsigned_tx_hash, structure_hash, status, mismatch_reason, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)`,
		r.ReviewID, r.OperationID, r.Intent.Source, r.Intent.Destination, r.Intent.Asset,
		r.Intent.Quantity, r.Intent.FeeSats, r.Inspection.Source, r.Inspection.Destination,
		r.Inspection.Asset, r.Inspection.Quantity, r.Inspection.FeeSats,
		r.UnsignedTxHash, r.Inspection.StructureHash, r.Status, r.MismatchReason, r.CreatedAt,
	)
	return err
}

func (s Store) SaveApproval(ctx context.Context, a neopayreview.Approval) error {
	if s.DB == nil { return errors.New("nil database") }
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return err }
	defer tx.Rollback()
	if err := saveApprovalTx(ctx, tx, a); err != nil { return err }
	return tx.Commit()
}

func saveApprovalTx(ctx context.Context, tx *sql.Tx, a neopayreview.Approval) error {
	res, err := tx.ExecContext(ctx, `
		UPDATE fintech_transaction_reviews
		SET status='approved_for_external_signing', updated_at=$1
		WHERE review_id=$2 AND status='verified' AND unsigned_tx_hash=$3`,
		a.ApprovedAt, a.ReviewID, a.UnsignedTxHash,
	)
	if err != nil { return err }
	n, err := res.RowsAffected()
	if err != nil { return err }
	if n != 1 { return errors.New("review is not verified or transaction hash changed") }
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO fintech_transaction_approvals
		(approval_id, review_id, actor_id, reason, unsigned_tx_hash, approved_at)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		a.ApprovalID, a.ReviewID, a.ActorID, a.Reason, a.UnsignedTxHash, a.ApprovedAt,
	); err != nil { return err }
	return nil
}

func (s Store) Claim(ctx context.Context, id neopayreview.OperationIdentity) (neopayreview.OperationResult, bool, error) {
	if s.DB == nil { return neopayreview.OperationResult{}, false, errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_idempotency
		(principal_id, operation, target_id, idempotency_key, fingerprint, status)
		VALUES ($1,$2,$3,$4,$5,'processing') ON CONFLICT DO NOTHING`,
		id.PrincipalID, id.Operation, id.TargetID, id.IdempotencyKey, id.Fingerprint)
	if err != nil { return neopayreview.OperationResult{}, false, err }
	n, err := res.RowsAffected()
	if err != nil { return neopayreview.OperationResult{}, false, err }
	if n == 1 { return neopayreview.OperationResult{}, true, nil }

	var fingerprint, status string
	if err := s.DB.QueryRowContext(ctx, `SELECT fingerprint, status FROM fintech_idempotency
		WHERE principal_id=$1 AND operation=$2 AND target_id=$3 AND idempotency_key=$4`,
		id.PrincipalID, id.Operation, id.TargetID, id.IdempotencyKey).Scan(&fingerprint, &status); err != nil {
		return neopayreview.OperationResult{}, false, err
	}
	if fingerprint != id.Fingerprint { return neopayreview.OperationResult{}, false, errors.New("idempotency key reused with different semantic input") }
	if status == "processing" { return neopayreview.OperationResult{}, false, nil }
	result, err := s.loadOperationResult(ctx, id)
	if err != nil { return neopayreview.OperationResult{}, false, err }
	return result, false, nil
}

func (s Store) CompleteReview(ctx context.Context, id neopayreview.OperationIdentity, r neopayreview.Review) error {
	if s.DB == nil { return errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `UPDATE fintech_idempotency SET status='succeeded', updated_at=now()
		WHERE principal_id=$1 AND operation=$2 AND target_id=$3 AND idempotency_key=$4 AND fingerprint=$5 AND status='processing'`,
		id.PrincipalID, id.Operation, id.TargetID, id.IdempotencyKey, id.Fingerprint)
	if err != nil { return err }
	n, err := res.RowsAffected(); if err != nil { return err }
	if n != 1 { return errors.New("review idempotency completion precondition failed") }
	return nil
}

func (s Store) CompleteApproval(ctx context.Context, id neopayreview.OperationIdentity, a neopayreview.Approval, r neopayreview.Review) error {
	if s.DB == nil { return errors.New("nil database") }
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return err }
	defer tx.Rollback()
	if err := saveApprovalTx(ctx, tx, a); err != nil { return err }
	res, err := tx.ExecContext(ctx, `UPDATE fintech_idempotency SET status='succeeded', updated_at=now()
		WHERE principal_id=$1 AND operation=$2 AND target_id=$3 AND idempotency_key=$4 AND fingerprint=$5 AND status='processing'`,
		id.PrincipalID, id.Operation, id.TargetID, id.IdempotencyKey, id.Fingerprint)
	if err != nil { return err }
	n, err := res.RowsAffected(); if err != nil { return err }
	if n != 1 { return errors.New("approval idempotency completion precondition failed") }
	return tx.Commit()
}

func (s Store) loadOperationResult(ctx context.Context, id neopayreview.OperationIdentity) (neopayreview.OperationResult, error) {
	var r neopayreview.Review
	var status string
	var structureHash sql.NullString
	err := s.DB.QueryRowContext(ctx, `SELECT review_id, operation_id, source_ref, destination_ref, asset,
		quantity_base_units, fee_sats, decoded_source_ref, decoded_destination_ref, decoded_asset,
		decoded_quantity_base_units, decoded_fee_sats, unsigned_tx_hash, structure_hash, status, COALESCE(mismatch_reason,''), created_at
		FROM fintech_transaction_reviews WHERE review_id=$1`, id.TargetID).Scan(
		&r.ReviewID, &r.OperationID, &r.Intent.Source, &r.Intent.Destination, &r.Intent.Asset,
		&r.Intent.Quantity, &r.Intent.FeeSats, &r.Inspection.Source, &r.Inspection.Destination, &r.Inspection.Asset,
		&r.Inspection.Quantity, &r.Inspection.FeeSats, &r.UnsignedTxHash, &structureHash, &status, &r.MismatchReason, &r.CreatedAt)
	if err != nil { return neopayreview.OperationResult{}, err }
	r.Inspection.StructureHash = structureHash.String
	r.Status = neopayreview.Status(status)
	result := neopayreview.OperationResult{Review:r, Exists:true}
	if id.Operation == "neopay_approval" {
		var a neopayreview.Approval
		err = s.DB.QueryRowContext(ctx, `SELECT approval_id, review_id, actor_id, reason, approved_at, unsigned_tx_hash
			FROM fintech_transaction_approvals WHERE review_id=$1`, id.TargetID).Scan(
			&a.ApprovalID, &a.ReviewID, &a.ActorID, &a.Reason, &a.ApprovedAt, &a.UnsignedTxHash)
		if err != nil { return neopayreview.OperationResult{}, err }
		result.Approval = a
	}
	return result, nil
}

func (s Store) SaveSignedVerification(ctx context.Context, v neopayreview.SignedVerification) error {
	if s.DB == nil { return errors.New("nil database") }
	_, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_signed_transaction_verifications (
		verification_id, review_id, approval_id, actor_id, signed_tx_hash,
		unsigned_structure_hash, signed_structure_hash, decoded_source_ref,
		decoded_destination_ref, decoded_asset, decoded_quantity_base_units,
		decoded_fee_sats, status, mismatch_reason, verified_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		v.VerificationID, v.ReviewID, v.ApprovalID, v.ActorID, v.SignedTxHash,
		v.UnsignedStructureHash, v.SignedStructureHash, v.Inspection.Source,
		v.Inspection.Destination, v.Inspection.Asset, v.Inspection.Quantity,
		v.Inspection.FeeSats, v.Status, v.MismatchReason, v.VerifiedAt)
	return err
}

func (s Store) SaveBroadcastAuthorization(ctx context.Context, a neopayreview.BroadcastAuthorization) error {
	if s.DB == nil { return errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_broadcast_authorizations (
		authorization_id, verification_id, review_id, approval_id, actor_id, reason, signed_tx_hash, authorized_at
	) SELECT $1,v.verification_id,v.review_id,v.approval_id,$5,$6,v.signed_tx_hash,$8
	  FROM fintech_signed_transaction_verifications v
	 WHERE v.verification_id=$2 AND v.review_id=$3 AND v.approval_id=$4
	   AND v.signed_tx_hash=$7 AND v.status='verified'`,
		a.AuthorizationID, a.VerificationID, a.ReviewID, a.ApprovalID,
		a.ActorID, a.Reason, a.SignedTxHash, a.AuthorizedAt)
	if err != nil { return err }
	n, err := res.RowsAffected(); if err != nil { return err }
	if n != 1 { return errors.New("broadcast authorization preconditions not satisfied") }
	return nil
}

func (s Store) SaveSignerHandoff(ctx context.Context, handoffID, reviewID, approvalID, unsignedTxHash, destination string) error {
	if s.DB == nil { return errors.New("nil database") }
	if handoffID == "" || reviewID == "" || approvalID == "" || unsignedTxHash == "" || destination == "" {
		return errors.New("complete signer handoff identity is required")
	}
	res, err := s.DB.ExecContext(ctx, `
		INSERT INTO fintech_signer_handoffs
		(handoff_id, review_id, approval_id, unsigned_tx_hash, destination)
		SELECT $1, r.review_id, a.approval_id, r.unsigned_tx_hash, $5
		FROM fintech_transaction_reviews r
		JOIN fintech_transaction_approvals a ON a.review_id=r.review_id
		WHERE r.review_id=$2 AND a.approval_id=$3
		  AND r.status='approved_for_external_signing'
		  AND r.unsigned_tx_hash=$4 AND a.unsigned_tx_hash=$4`,
		handoffID, reviewID, approvalID, unsignedTxHash, destination,
	)
	if err != nil { return err }
	n, err := res.RowsAffected()
	if err != nil { return err }
	if n != 1 { return errors.New("signer handoff preconditions not satisfied") }
	return nil
}
