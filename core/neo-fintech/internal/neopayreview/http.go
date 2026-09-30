package neopayreview

import (
	"encoding/json"
	"net/http"
)

type PrepareRequest struct {
	ReviewID    string `json:"review_id"`
	OperationID string `json:"operation_id"`
	Intent      Intent `json:"intent"`
}

type PrepareResponse struct {
	Review     Review `json:"review"`
	UnsignedTx string `json:"unsigned_tx,omitempty"`
}

// PrepareHandler exposes the review preparation boundary only. Authentication,
// rate limiting, idempotency middleware, and the concrete composer/inspector are
// deployment responsibilities and must be injected before registration.
func PrepareHandler(service Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		defer r.Body.Close()
		var req PrepareRequest
		dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil {
			http.Error(w, "invalid review request", http.StatusBadRequest)
			return
		}
		review, unsignedTx, err := service.Prepare(r.Context(), req.ReviewID, req.OperationID, req.Intent)
		if err != nil {
			http.Error(w, "transaction review unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if review.Status == StatusRejected {
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(PrepareResponse{Review: review})
			return
		}
		_ = json.NewEncoder(w).Encode(PrepareResponse{Review: review, UnsignedTx: unsignedTx})
	}
}
