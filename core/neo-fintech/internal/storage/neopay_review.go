package storage

import (
	"context"
	"errors"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

// LoadTransactionReview returns the authoritative persisted review used by the
// authenticated approval handler. Client-supplied status and hashes are ignored.
func (s Store) LoadTransactionReview(ctx context.Context, reviewID string) (neopayreview.Review, error) {
	if s.DB == nil { return neopayreview.Review{}, errors.New("nil database") }
	var r neopayreview.Review
	var status string
	err := s.DB.QueryRowContext(ctx, `SELECT review_id, operation_id, source_ref, destination_ref, asset,
		quantity_base_units, fee_sats, decoded_source_ref, decoded_destination_ref, decoded_asset,
		decoded_quantity_base_units, decoded_fee_sats, unsigned_tx_hash, status,
		COALESCE(mismatch_reason,''), created_at
		FROM fintech_transaction_reviews WHERE review_id=$1`, reviewID).Scan(
		&r.ReviewID, &r.OperationID, &r.Intent.Source, &r.Intent.Destination, &r.Intent.Asset,
		&r.Intent.Quantity, &r.Intent.FeeSats, &r.Inspection.Source, &r.Inspection.Destination,
		&r.Inspection.Asset, &r.Inspection.Quantity, &r.Inspection.FeeSats, &r.UnsignedTxHash,
		&status, &r.MismatchReason, &r.CreatedAt)
	if err != nil { return neopayreview.Review{}, err }
	r.Status = neopayreview.Status(status)
	return r, nil
}
