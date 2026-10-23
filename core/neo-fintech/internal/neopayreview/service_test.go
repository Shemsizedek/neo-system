package neopayreview

import (
	"context"
	"testing"
	"time"
)

type memoryWriter struct{ reviews []Review }
func (m *memoryWriter) SaveTransactionReview(_ context.Context, r Review) error { m.reviews = append(m.reviews, r); return nil }

func TestPrepareRequiresIndependentInspector(t *testing.T) {
	w := &memoryWriter{}
	s := Service{
		Compose: func(context.Context, Intent) (string, error) { return "deadbeef", nil },
		Writer: w,
	}
	_, _, err := s.Prepare(context.Background(), "r1", "op1", Intent{Source:"src", Destination:"dst", Asset:"XCP", Quantity:1})
	if err == nil { t.Fatal("expected missing inspector to fail closed") }
}

func TestPreparePersistsMismatchEvidence(t *testing.T) {
	w := &memoryWriter{}
	s := Service{
		Compose: func(context.Context, Intent) (string, error) { return "deadbeef", nil },
		Inspect: func(context.Context, string) (Inspection, error) { return Inspection{Source:"src", Destination:"other", Asset:"XCP", Quantity:1}, nil },
		Writer: w,
		Now: func() time.Time { return time.Unix(1700000000,0) },
	}
	r, _, err := s.Prepare(context.Background(), "r2", "op2", Intent{Source:"src", Destination:"dst", Asset:"XCP", Quantity:1})
	if err != nil { t.Fatal(err) }
	if r.Status != StatusRejected { t.Fatalf("expected rejected, got %s", r.Status) }
	if len(w.reviews) != 1 { t.Fatal("mismatch evidence was not persisted") }
}
