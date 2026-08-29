package bitcoinxcp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInspectUnsignedSend(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v2/transactions/info" { t.Fatalf("unexpected path %s", r.URL.Path) }
		if r.URL.Query().Get("rawtransaction") != "deadbeef" { t.Fatal("rawtransaction query missing") }
		w.Header().Set("X-COUNTERPARTY-READY", "true")
		_, _ = w.Write([]byte(`{"result":{"source":"src","destination":"dst","fee":700,"unpacked_data":{"message_type":"send","message_data":{"asset":"XCP","quantity":25,"destination":"dst"}}}}`))
	}))
	defer srv.Close()

	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	inspection, err := a.InspectUnsigned(context.Background(), "deadbeef")
	if err != nil { t.Fatal(err) }
	if inspection.Source != "src" || inspection.Destination != "dst" || inspection.Asset != "XCP" || inspection.Quantity != 25 || inspection.FeeSats != 700 {
		t.Fatalf("unexpected inspection: %+v", inspection)
	}
}

func TestInspectUnsignedRejectsWrongMessageType(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"result":{"source":"src","destination":"dst","fee":1,"unpacked_data":{"message_type":"sweep","message_data":{}}}}`))
	}))
	defer srv.Close()
	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	if _, err := a.InspectUnsigned(context.Background(), "deadbeef"); err == nil { t.Fatal("expected message type rejection") }
}
