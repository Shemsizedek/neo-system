package neopayreview

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

type ReviewReader interface {
	LoadTransactionReview(context.Context, string) (Review, error)
}

type ApprovalRequest struct {
	ReviewID   string `json:"review_id"`
	ApprovalID string `json:"approval_id"`
	Reason     string `json:"reason"`
	UnsignedTx string `json:"unsigned_tx"`
}

type ApprovalResponse struct {
	Approval Approval `json:"approval"`
	Review   Review   `json:"review"`
	Replay   bool     `json:"replay"`
}

// AuthenticatedPrepareHandler requires an upstream authenticator to inject a
// Principal into request context. The Idempotency-Key header is mandatory.
func AuthenticatedPrepareHandler(service Service, registry OperationRegistry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", http.StatusMethodNotAllowed); return }
		if _, ok := PrincipalFromContext(r.Context()); !ok { http.Error(w, "unauthorized", http.StatusUnauthorized); return }
		key := r.Header.Get("Idempotency-Key")
		if key == "" { http.Error(w, "Idempotency-Key required", http.StatusBadRequest); return }
		defer r.Body.Close()
		var req PrepareRequest
		dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)); dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil { http.Error(w, "invalid review request", http.StatusBadRequest); return }
		review, unsignedTx, replay, err := PrepareAuthenticated(r.Context(), registry, service, req.ReviewID, req.OperationID, req.Intent, key)
		if err != nil { http.Error(w, "transaction review unavailable", http.StatusConflict); return }
		w.Header().Set("Content-Type", "application/json")
		if review.Status == StatusRejected {
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(map[string]any{"review":review, "replay":replay})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"review":review, "unsigned_tx":unsignedTx, "replay":replay})
	}
}

// AuthenticatedApprovalHandler loads the authoritative persisted review before
// approving. Client-supplied review status or hashes are never trusted.
func AuthenticatedApprovalHandler(registry OperationRegistry, reader ReviewReader, now func() time.Time) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", http.StatusMethodNotAllowed); return }
		if _, ok := PrincipalFromContext(r.Context()); !ok { http.Error(w, "unauthorized", http.StatusUnauthorized); return }
		if reader == nil || registry == nil { http.Error(w, "approval service unavailable", http.StatusServiceUnavailable); return }
		key := r.Header.Get("Idempotency-Key")
		if key == "" { http.Error(w, "Idempotency-Key required", http.StatusBadRequest); return }
		defer r.Body.Close()
		var req ApprovalRequest
		dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10)); dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil { http.Error(w, "invalid approval request", http.StatusBadRequest); return }
		review, err := reader.LoadTransactionReview(r.Context(), req.ReviewID)
		if err != nil { http.Error(w, "review not found", http.StatusNotFound); return }
		approval, updated, replay, err := ApproveVerified(r.Context(), registry, review, req.ApprovalID, req.Reason, req.UnsignedTx, key, now)
		if err != nil { http.Error(w, "approval rejected", http.StatusConflict); return }
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ApprovalResponse{Approval:approval, Review:updated, Replay:replay})
	}
}
