package bitcoinxcp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/rails"
)

func TestTransactionEvidenceConfirmed(t *testing.T) {
	txid := strings.Repeat("a", 64)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/tx/"+txid { t.Fatalf("unexpected path %s", r.URL.Path) }
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"txid":"` + txid + `","status":{"confirmed":true,"block_height":900000,"block_hash":"blockhash","block_time":1700000000},"fee":1234}`))
	}))
	defer srv.Close()

	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	e, err := a.TransactionEvidence(context.Background(), txid)
	if err != nil { t.Fatal(err) }
	if !e.Authoritative || e.Kind != "bitcoin_block_confirmed" { t.Fatalf("unexpected evidence: %+v", e) }
}

func TestComposeSendNoBroadcast(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/compose/send" { t.Fatalf("unexpected path %s", r.URL.Path) }
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"result":{"rawtransaction":"deadbeef"}}`))
	}))
	defer srv.Close()

	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	res, err := a.ComposeSend(context.Background(), ComposeSendRequest{Source: "src", Destination: "dst", Asset: "xcp", Quantity: 100, FeeSats: 1000})
	if err != nil { t.Fatal(err) }
	if res.UnsignedTx != "deadbeef" || res.Asset != "XCP" { t.Fatalf("unexpected compose result: %+v", res) }
	if _, err := a.Submit(context.Background(), rails.Command{}); err != ErrBroadcastDisabled { t.Fatalf("expected broadcast disabled, got %v", err) }
}

func TestComposeRejectsExcessiveFee(t *testing.T) {
	a, err := New(Config{BitcoinBaseURL: "https://btc.example", CounterpartyBaseURL: "https://xcp.example", MaxFeeSats: 1000})
	if err != nil { t.Fatal(err) }
	_, err = a.ComposeSend(context.Background(), ComposeSendRequest{Source: "src", Destination: "dst", Asset: "XCP", Quantity: 1, FeeSats: 1001})
	if err == nil { t.Fatal("expected excessive fee rejection") }
}
