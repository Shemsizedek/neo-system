package bitcoinxcp

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

// InspectUnsigned uses Counterparty Core's transaction-info parser as an
// independent decode path for a composed unsigned transaction. It does not sign
// or broadcast the transaction.
func (a *Adapter) InspectUnsigned(ctx context.Context, rawTransaction string) (neopayreview.Inspection, error) {
	rawTransaction = strings.TrimSpace(rawTransaction)
	if rawTransaction == "" {
		return neopayreview.Inspection{}, errors.New("raw transaction is required")
	}
	if _, err := hex.DecodeString(rawTransaction); err != nil {
		return neopayreview.Inspection{}, errors.New("raw transaction must be hexadecimal")
	}

	endpoint := *a.counterpartyBase
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/v2/transactions/info"
	q := endpoint.Query()
	q.Set("rawtransaction", rawTransaction)
	endpoint.RawQuery = q.Encode()
	body, headers, err := a.get(ctx, endpoint.String())
	if err != nil {
		return neopayreview.Inspection{}, err
	}
	if ready := headers.Get("X-COUNTERPARTY-READY"); ready != "" && !strings.EqualFold(ready, "true") {
		return neopayreview.Inspection{}, errors.New("Counterparty node is not ready")
	}

	var envelope struct {
		Result struct {
			Source       string `json:"source"`
			Destination  string `json:"destination"`
			Fee          int64  `json:"fee"`
			UnpackedData struct {
				MessageType string          `json:"message_type"`
				MessageData json.RawMessage `json:"message_data"`
			} `json:"unpacked_data"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return neopayreview.Inspection{}, fmt.Errorf("decode Counterparty transaction info: %w", err)
	}

	messageType := strings.ToLower(strings.TrimSpace(envelope.Result.UnpackedData.MessageType))
	if messageType != "send" && messageType != "enhanced_send" {
		return neopayreview.Inspection{}, fmt.Errorf("unexpected Counterparty message type %q", messageType)
	}
	var send struct {
		Asset       string `json:"asset"`
		Quantity    int64  `json:"quantity"`
		Destination string `json:"destination"`
	}
	if err := json.Unmarshal(envelope.Result.UnpackedData.MessageData, &send); err != nil {
		return neopayreview.Inspection{}, fmt.Errorf("decode Counterparty send payload: %w", err)
	}
	destination := strings.TrimSpace(send.Destination)
	if destination == "" {
		destination = strings.TrimSpace(envelope.Result.Destination)
	}
	return neopayreview.Inspection{
		Source:      strings.TrimSpace(envelope.Result.Source),
		Destination: destination,
		Asset:       strings.ToUpper(strings.TrimSpace(send.Asset)),
		Quantity:    send.Quantity,
		FeeSats:     envelope.Result.Fee,
	}, nil
}
