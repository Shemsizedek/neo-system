package bitcoinrpc

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

func TestRejectsInsecureRemoteRPC(t *testing.T) {
	if _, err := New(Config{URL:"http://example.com:8332"}); err == nil { t.Fatal("expected HTTPS requirement") }
}

func TestMempoolValidationAndBroadcast(t *testing.T) {
	var methods []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != "rpcuser" || pass != "rpcpass" { t.Fatal("missing RPC basic auth") }
		var req struct { Method string `json:"method"`; Params json.RawMessage `json:"params"` }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil { t.Fatal(err) }
		methods = append(methods, req.Method)
		w.Header().Set("Content-Type", "application/json")
		switch req.Method {
		case "testmempoolaccept":
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"neo-fintech","result":[{"txid":"tx1","wtxid":"wtx1","allowed":true,"vsize":141}],"error":null}`))
		case "sendrawtransaction":
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"neo-fintech","result":"tx1","error":null}`))
		default:
			t.Fatalf("unexpected method %s", req.Method)
		}
	}))
	defer srv.Close()
	client, err := New(Config{URL:srv.URL, Username:"rpcuser", Password:"rpcpass"})
	if err != nil { t.Fatal(err) }
	validation, err := client.TestMempoolAccept(context.Background(), "deadbeef")
	if err != nil { t.Fatal(err) }
	if !validation.Allowed || validation.TxID != "tx1" || validation.WTxID != "wtx1" || validation.VSize != 141 { t.Fatalf("unexpected validation %+v", validation) }
	result, err := client.SendRawTransaction(context.Background(), "deadbeef")
	if err != nil { t.Fatal(err) }
	if result.Outcome != neopayreview.BroadcastNodeAccepted || result.TxID != "tx1" { t.Fatalf("unexpected broadcast result %+v", result) }
	if len(methods) != 2 || methods[0] != "testmempoolaccept" || methods[1] != "sendrawtransaction" { t.Fatalf("unexpected RPC calls %v", methods) }
}

func TestMempoolValidationRejectionIsEvidenceNotTransportError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"neo-fintech","result":[{"txid":"txbad","wtxid":"wtxbad","allowed":false,"reject-reason":"mandatory-script-verify-flag-failed","reject-details":"Script failed an OP_CHECKSIG operation"}],"error":null}`))
	}))
	defer srv.Close()
	client, err := New(Config{URL:srv.URL}); if err != nil { t.Fatal(err) }
	validation, err := client.TestMempoolAccept(context.Background(), "deadbeef")
	if err != nil { t.Fatal(err) }
	if validation.Allowed || validation.RejectReason == "" { t.Fatalf("expected durable rejection evidence %+v", validation) }
}
