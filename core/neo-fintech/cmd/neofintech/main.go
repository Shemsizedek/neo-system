package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "service": "neo-fintech-core"})
	})
	mux.HandleFunc("GET /v1/capabilities", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"money": "exact minor units",
			"ledger": "balanced immutable journals",
			"payments": "explicit lifecycle state machine",
			"idempotency": "scoped semantic replay control",
			"rails": []map[string]any{{
				"name": "bitcoin-counterparty",
				"mode": "read-compose-review-verify-signed-validate-broadcast",
				"broadcast_default_enabled": false,
				"server_side_signing": false,
			}},
			"neopay_transaction_review": map[string]any{
				"mode": "compose-inspect-approve-external-signing-reinspect-consensus-validate",
				"requires_independent_inspector": true,
				"signature_independent_structure_hash": true,
				"signed_transaction_verification": true,
				"bitcoin_core_testmempoolaccept_required": true,
				"broadcast_attempt_persisted_before_submit": true,
				"ambiguous_submit_requires_reconciliation": true,
				"server_side_private_keys": false,
				"public_route_registered": false,
			},
			"live_funds_enabled": false,
		})
	})
	log.Println("NEO Fintech Core listening on :8088")
	log.Fatal(http.ListenAndServe(":8088", mux))
}
