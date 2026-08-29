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

// SaveJournal persists a validated journal and all entries atomically.
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

// ClaimIdempotency atomically establishes the financial operation identity.
// A uniqueness conflict must be followed by loading the stored record and
// validating semantic fingerprint reuse before any external side effect.
func (s Store) ClaimIdempotency(ctx context.Context, r idempotency.Record) (bool, error) {
	if s.DB == nil { return false, errors.New("nil database") }
	res, err := s.DB.ExecContext(ctx, `INSERT INTO fintech_idempotency (principal_id, operation, target_id, idempotency_key, fingerprint, provider_operation_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, r.PrincipalID, r.Operation, r.TargetID, r.Key, r.Fingerprint, r.ProviderOperationID, r.Status)
	if err != nil { return false, err }
	n, err := res.RowsAffected()
	if err != nil { return false, fmt.Errorf("rows affected: %w", err) }
	return n == 1, nil
}

// SaveTransactionReview stores both intended and independently inspected values.
// A rejected review is durable evidence and must not be rewritten into approval.
func (s Store) SaveTransactionReview(ctx context.Context, r neopayreview.Review) error {
	if s.DB == nil { return errors.New("nil database") }
	_, err := s.DB.ExecContext(ctx, `
		INSERT INTO fintech_transaction_reviews (
			review_id, operation_id, source_ref, destination_ref, asset,
			quantity_base_units, fee_sats, decoded_source_ref, decoded_destination_ref,
			decoded_asset, decoded_quantity_base_units, decoded_fee_sats,
			unsigned_tx_hash, status, mismatch_reason, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
		r.ReviewID, r.OperationID, r.Intent.Source, r.Intent.Destination, r.Intent.Asset,
		r.Intent.Quantity, r.Intent.FeeSats, r.Inspection.Source, r.Inspection.Destination,
		r.Inspection.Asset, r.Inspection.Quantity, r.Inspection.FeeSats,
		r.UnsignedTxHash, r.Status, r.MismatchReason, r.CreatedAt,
	)
	return err
}

// SaveApproval and review status update are one serializable transaction.
// The transaction hash is repeated on both records to bind approval to exact bytes.
func (s Store) SaveApproval(ctx context.Context, a neopayreview.Approval) error {
	if s.DB == nil { return errors.New("nil database") }
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil { return err }
	defer tx.Rollback()
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
	return tx.Commit()
}

// SaveSignerHandoff records that an already-approved unsigned transaction was
// handed to an external signer surface. It does not store a key or signature.
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
