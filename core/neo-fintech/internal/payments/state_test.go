package payments

import "testing"

func TestLifecycle(t *testing.T) {
	s, err := Apply(StateCreated, EventAuthorizeOK)
	if err != nil || s != StateAuthorized { t.Fatalf("authorize: %v %s", err, s) }
	s, err = Apply(s, EventCaptureOK)
	if err != nil || s != StateCaptured { t.Fatalf("capture: %v %s", err, s) }
	s, err = Apply(s, EventSettlementOK)
	if err != nil || s != StateSettled { t.Fatalf("settle: %v %s", err, s) }
}

func TestIllegalTransition(t *testing.T) {
	if _, err := Apply(StateCreated, EventRefundOK); err == nil { t.Fatal("expected illegal transition") }
}
