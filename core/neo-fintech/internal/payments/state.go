package payments

import "fmt"

type State string

const (
	StateCreated    State = "created"
	StateAuthorized State = "authorized"
	StateCaptured   State = "captured"
	StateRefunded   State = "refunded"
	StateReversed   State = "reversed"
	StateDisputed   State = "disputed"
	StateSettled    State = "settled"
	StateAmbiguous  State = "ambiguous"
)

type Event string

const (
	EventAuthorizeOK  Event = "authorize_succeeded"
	EventCaptureOK    Event = "capture_succeeded"
	EventRefundOK     Event = "refund_succeeded"
	EventReverseOK    Event = "reversal_succeeded"
	EventDisputeOpen  Event = "dispute_opened"
	EventSettlementOK Event = "settlement_confirmed"
	EventUnknown      Event = "provider_outcome_ambiguous"
)

func Apply(current State, event Event) (State, error) {
	if event == EventUnknown {
		return StateAmbiguous, nil
	}
	switch current {
	case StateCreated:
		if event == EventAuthorizeOK { return StateAuthorized, nil }
	case StateAuthorized:
		if event == EventCaptureOK { return StateCaptured, nil }
		if event == EventReverseOK { return StateReversed, nil }
	case StateCaptured:
		if event == EventRefundOK { return StateRefunded, nil }
		if event == EventDisputeOpen { return StateDisputed, nil }
		if event == EventSettlementOK { return StateSettled, nil }
	case StateSettled:
		if event == EventRefundOK { return StateRefunded, nil }
		if event == EventDisputeOpen { return StateDisputed, nil }
	case StateAmbiguous:
		// Ambiguous operations must be reconciled against authoritative provider evidence.
		if event == EventAuthorizeOK { return StateAuthorized, nil }
		if event == EventCaptureOK { return StateCaptured, nil }
	}
	return current, fmt.Errorf("illegal payment transition: state=%s event=%s", current, event)
}
