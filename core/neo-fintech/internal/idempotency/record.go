package idempotency

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

type Status string

const (
	Processing Status = "processing"
	Succeeded  Status = "succeeded"
	FailedFinal Status = "failed_final"
	Ambiguous Status = "ambiguous"
)

type Record struct {
	PrincipalID string `json:"principal_id"`
	Operation   string `json:"operation"`
	TargetID    string `json:"target_id"`
	Key         string `json:"key"`
	Fingerprint string `json:"fingerprint"`
	ProviderOperationID string `json:"provider_operation_id,omitempty"`
	Status Status `json:"status"`
}

func Fingerprint(canonicalSemanticInput []byte) string {
	s := sha256.Sum256(canonicalSemanticInput)
	return hex.EncodeToString(s[:])
}

func (r Record) ValidateReuse(principal, operation, target, key, fingerprint string) error {
	if r.PrincipalID != principal || r.Operation != operation || r.TargetID != target || r.Key != key {
		return errors.New("idempotency scope mismatch")
	}
	if r.Fingerprint != fingerprint {
		return errors.New("idempotency key reused with different semantic input")
	}
	return nil
}
