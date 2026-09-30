package rails

import (
	"context"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/money"
)

// Adapter is intentionally conditional: each deployed rail defines its own
// authoritative evidence, finality, retry, fee, and timing semantics.
type Adapter interface {
	Name() string
	Capabilities(context.Context) (Capabilities, error)
	Submit(context.Context, Command) (Submission, error)
	Query(context.Context, string) (Evidence, error)
}

type Capabilities struct {
	Authorize bool `json:"authorize"`
	Capture bool `json:"capture"`
	Refund bool `json:"refund"`
	Transfer bool `json:"transfer"`
	SettlementEvidence bool `json:"settlement_evidence"`
}

type Command struct {
	OperationID string `json:"operation_id"`
	Type string `json:"type"`
	Amount money.Money `json:"amount"`
	SourceRef string `json:"source_ref,omitempty"`
	DestinationRef string `json:"destination_ref,omitempty"`
}

type Submission struct {
	ProviderOperationID string `json:"provider_operation_id"`
	AcceptedForProcessing bool `json:"accepted_for_processing"`
	// FinancialSuccess is deliberately absent. Acceptance is not settlement.
}

type Evidence struct {
	ProviderOperationID string `json:"provider_operation_id"`
	ProviderEventID string `json:"provider_event_id,omitempty"`
	Kind string `json:"kind"`
	Authoritative bool `json:"authoritative"`
	ObservedAt time.Time `json:"observed_at"`
	PayloadHash string `json:"payload_hash"`
}
