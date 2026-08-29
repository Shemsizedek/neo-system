package neopayreview

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPrepareHandlerWithholdsUnsignedTxOnMismatch(t *testing.T) {
	w := &memoryWriter{}
	svc := Service{
		Compose: func(context.Context, Intent) (string, error) { return "deadbeef", nil },
		Inspect: func(context.Context, string) (Inspection, error) {
			return Inspection{Source:"src", Destination:"wrong", Asset:"XCP", Quantity:1, FeeSats:0}, nil
		},
		Writer: w,
	}
	body := []byte(`{"review_id":"r-http","operation_id":"op-http","intent":{"source":"src","destination":"dst","asset":"XCP","quantity":1,"fee_sats":0}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/neopay/reviews", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	PrepareHandler(svc).ServeHTTP(rr, req)
	if rr.Code != http.StatusConflict { t.Fatalf("expected 409, got %d", rr.Code) }
	if bytes.Contains(rr.Body.Bytes(), []byte("deadbeef")) { t.Fatal("rejected review leaked unsigned transaction") }
}
