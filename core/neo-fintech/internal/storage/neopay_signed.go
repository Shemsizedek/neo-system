package storage

import (
	"context"
	"database/sql"
	"errors"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

// LoadApprovedReview loads review + approval from durable storage. Callers do
// not accept review status, approval identity, or transaction hashes from the client.
func (s Store) LoadApprovedReview(ctx context.Context, reviewID string) (neopayreview.Review, neopayreview.Approval, error) {
	if s.DB == nil { return neopayreview.Review{}, neopayreview.Approval{}, errors.New("nil database") }
	var r neopayreview.Review
	var a neopayreview.Approval
	var status string
	var structureHash sql.NullString
	err := s.DB.QueryRowContext(ctx, `SELECT
		r.review_id, r.operation_id, r.source_ref, r.destination_ref, r.asset,
		r.quantity_base_units, r.fee_sats, r.decoded_source_ref, r.decoded_destination_ref,
		r.decoded_asset, r.decoded_quantity_base_units, r.decoded_fee_sats,
		r.unsigned_tx_hash, r.structure_hash, r.status, COALESCE(r.mismatch_reason,''), r.created_at,
		a.approval_id, a.review_id, a.actor_id, a.reason, a.approved_at, a.unsigned_tx_hash
	FROM fintech_transaction_reviews r
	JOIN fintech_transaction_approvals a ON a.review_id=r.review_id
	WHERE r.review_id=$1 AND r.status='approved_for_external_signing'`, reviewID).Scan(
		&r.ReviewID, &r.OperationID, &r.Intent.Source, &r.Intent.Destination, &r.Intent.Asset,
		&r.Intent.Quantity, &r.Intent.FeeSats, &r.Inspection.Source, &r.Inspection.Destination,
		&r.Inspection.Asset, &r.Inspection.Quantity, &r.Inspection.FeeSats,
		&r.UnsignedTxHash, &structureHash, &status, &r.MismatchReason, &r.CreatedAt,
		&a.ApprovalID, &a.ReviewID, &a.ActorID, &a.Reason, &a.ApprovedAt, &a.UnsignedTxHash)
	if err != nil { return neopayreview.Review{}, neopayreview.Approval{}, err }
	r.Status = neopayreview.Status(status)
	r.Inspection.StructureHash = structureHash.String
	if r.UnsignedTxHash != a.UnsignedTxHash { return neopayreview.Review{}, neopayreview.Approval{}, errors.New("stored approval hash does not match review") }
	return r, a, nil
}
