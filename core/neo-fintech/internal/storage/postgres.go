package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/idempotency"
	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/ledger"
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
