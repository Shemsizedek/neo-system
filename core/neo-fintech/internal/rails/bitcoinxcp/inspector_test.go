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
		_, _ = w.Write([]byte(`{"result":{"source":"src","destination":"dst","fee":700,"decoded_tx":{"version":2,"lock_time":0,"vin":[{"prevout_hash":"abc","prevout_n":1,"sequence":4294967295,"script_sig":""}],"vout":[{"value":546,"script_pub_key":"6a01ff"}]},"unpacked_data":{"message_type":"send","message_data":{"asset":"XCP","quantity":25,"destination":"dst"}}}}`))
	}))
	defer srv.Close()

	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	inspection, err := a.InspectUnsigned(context.Background(), "deadbeef")
	if err != nil { t.Fatal(err) }
	if inspection.Source != "src" || inspection.Destination != "dst" || inspection.Asset != "XCP" || inspection.Quantity != 25 || inspection.FeeSats != 700 || inspection.StructureHash == "" {
		t.Fatalf("unexpected inspection: %+v", inspection)
	}
}

func TestSignatureIndependentHashIgnoresUnlockingData(t *testing.T) {
	unsigned := []byte(`{"txid":"u","vin":[{"prevout_hash":"abc","prevout_n":1,"sequence":9,"script_sig":"","txinwitness":[]}],"vout":[{"value":10,"script_pub_key":"51"}]}`)
	signed := []byte(`{"txid":"s","hash":"w","vin":[{"prevout_hash":"abc","prevout_n":1,"sequence":9,"script_sig":"3044","txinwitness":["sig","pub"]}],"vout":[{"value":10,"script_pub_key":"51"}]}`)
	a, err := signatureIndependentHash(unsigned); if err != nil { t.Fatal(err) }
	b, err := signatureIndependentHash(signed); if err != nil { t.Fatal(err) }
	if a != b { t.Fatalf("signature material changed structure hash: %s != %s", a, b) }
}

func TestSignatureIndependentHashDetectsOutputChange(t *testing.T) {
	a, err := signatureIndependentHash([]byte(`{"vin":[{"prevout_hash":"abc","prevout_n":1}],"vout":[{"value":10,"script_pub_key":"51"}]}`)); if err != nil { t.Fatal(err) }
	b, err := signatureIndependentHash([]byte(`{"vin":[{"prevout_hash":"abc","prevout_n":1}],"vout":[{"value":11,"script_pub_key":"51"}]}`)); if err != nil { t.Fatal(err) }
	if a == b { t.Fatal("output mutation was not detected") }
}

func TestInspectUnsignedRejectsWrongMessageType(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"result":{"source":"src","destination":"dst","fee":1,"decoded_tx":{"vin":[],"vout":[]},"unpacked_data":{"message_type":"sweep","message_data":{}}}}`))
	}))
	defer srv.Close()
	a, err := New(Config{BitcoinBaseURL: srv.URL, CounterpartyBaseURL: srv.URL, MaxFeeSats: 50000})
	if err != nil { t.Fatal(err) }
	if _, err := a.InspectUnsigned(context.Background(), "deadbeef"); err == nil { t.Fatal("expected message type rejection") }
}
