package bitcoinxcp

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/money"
	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/rails"
)

var (
	ErrBroadcastDisabled = errors.New("broadcast is disabled in read-compose mode")
	ErrSigningDisabled   = errors.New("private-key signing is disabled in this service")
)

type Config struct {
	BitcoinBaseURL      string
	CounterpartyBaseURL string
	HTTPClient          *http.Client
	MaxFeeSats          int64
}

type Adapter struct {
	bitcoinBase      *url.URL
	counterpartyBase *url.URL
	client           *http.Client
	maxFeeSats       int64
}

func New(cfg Config) (*Adapter, error) {
	btc, err := url.Parse(strings.TrimRight(cfg.BitcoinBaseURL, "/"))
	if err != nil || btc.Scheme == "" || btc.Host == "" {
		return nil, errors.New("valid Bitcoin base URL is required")
	}
	xcp, err := url.Parse(strings.TrimRight(cfg.CounterpartyBaseURL, "/"))
	if err != nil || xcp.Scheme == "" || xcp.Host == "" {
		return nil, errors.New("valid Counterparty base URL is required")
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	if cfg.MaxFeeSats <= 0 {
		return nil, errors.New("positive max fee in satoshis is required")
	}
	return &Adapter{bitcoinBase: btc, counterpartyBase: xcp, client: client, maxFeeSats: cfg.MaxFeeSats}, nil
}

func (a *Adapter) Name() string { return "bitcoin-counterparty" }

func (a *Adapter) Capabilities(context.Context) (rails.Capabilities, error) {
	return rails.Capabilities{Transfer: true, SettlementEvidence: true}, nil
}

func (a *Adapter) Submit(context.Context, rails.Command) (rails.Submission, error) {
	return rails.Submission{}, ErrBroadcastDisabled
}

func (a *Adapter) Query(ctx context.Context, providerOperationID string) (rails.Evidence, error) {
	return a.TransactionEvidence(ctx, providerOperationID)
}

type BitcoinTx struct {
	TxID          string `json:"txid"`
	Status        struct {
		Confirmed   bool   `json:"confirmed"`
		BlockHeight int64  `json:"block_height,omitempty"`
		BlockHash   string `json:"block_hash,omitempty"`
		BlockTime   int64  `json:"block_time,omitempty"`
	} `json:"status"`
	Fee int64 `json:"fee,omitempty"`
}

func (a *Adapter) TransactionEvidence(ctx context.Context, txid string) (rails.Evidence, error) {
	if err := validateTxID(txid); err != nil {
		return rails.Evidence{}, err
	}
	endpoint := *a.bitcoinBase
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/tx/" + txid
	body, err := a.get(ctx, endpoint.String())
	if err != nil {
		return rails.Evidence{}, err
	}
	var tx BitcoinTx
	if err := json.Unmarshal(body, &tx); err != nil {
		return rails.Evidence{}, fmt.Errorf("decode bitcoin transaction: %w", err)
	}
	if tx.TxID != txid {
		return rails.Evidence{}, errors.New("bitcoin evidence txid mismatch")
	}
	h := sha256.Sum256(body)
	kind := "bitcoin_mempool_observed"
	authoritative := false
	observedAt := time.Now().UTC()
	if tx.Status.Confirmed {
		kind = "bitcoin_block_confirmed"
		authoritative = tx.Status.BlockHash != "" && tx.Status.BlockHeight > 0
		if tx.Status.BlockTime > 0 {
			observedAt = time.Unix(tx.Status.BlockTime, 0).UTC()
		}
	}
	return rails.Evidence{
		ProviderOperationID: txid,
		ProviderEventID:     tx.Status.BlockHash,
		Kind:                kind,
		Authoritative:       authoritative,
		ObservedAt:          observedAt,
		PayloadHash:         hex.EncodeToString(h[:]),
	}, nil
}

type ComposeSendRequest struct {
	Source      string
	Destination string
	Asset       string
	Quantity    int64
	FeeSats     int64
}

type ComposeResult struct {
	UnsignedTx string `json:"unsigned_tx"`
	Source     string `json:"source"`
	Asset      string `json:"asset"`
	Quantity   int64  `json:"quantity"`
	FeeSats    int64  `json:"fee_sats"`
}

func (a *Adapter) ComposeSend(ctx context.Context, req ComposeSendRequest) (ComposeResult, error) {
	if strings.TrimSpace(req.Source) == "" || strings.TrimSpace(req.Destination) == "" {
		return ComposeResult{}, errors.New("source and destination are required")
	}
	asset := strings.ToUpper(strings.TrimSpace(req.Asset))
	if asset == "" {
		return ComposeResult{}, errors.New("asset is required")
	}
	if req.Quantity <= 0 {
		return ComposeResult{}, errors.New("quantity must be positive exact base units")
	}
	if req.FeeSats < 0 || req.FeeSats > a.maxFeeSats {
		return ComposeResult{}, fmt.Errorf("fee_sats outside allowed range 0..%d", a.maxFeeSats)
	}

	payload := map[string]any{
		"source": req.Source,
		"destination": req.Destination,
		"asset": asset,
		"quantity": req.Quantity,
		"exact_fee": req.FeeSats,
		"encoding": "auto",
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return ComposeResult{}, err
	}
	endpoint := *a.counterpartyBase
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + "/compose/send"
	body, err := a.post(ctx, endpoint.String(), encoded)
	if err != nil {
		return ComposeResult{}, err
	}

	var envelope struct {
		Result struct {
			RawTransaction string `json:"rawtransaction"`
			UnsignedTx     string `json:"unsigned_tx"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return ComposeResult{}, fmt.Errorf("decode Counterparty compose response: %w", err)
	}
	unsigned := envelope.Result.UnsignedTx
	if unsigned == "" {
		unsigned = envelope.Result.RawTransaction
	}
	if strings.TrimSpace(unsigned) == "" {
		return ComposeResult{}, errors.New("Counterparty compose response missing unsigned transaction")
	}
	return ComposeResult{UnsignedTx: unsigned, Source: req.Source, Asset: asset, Quantity: req.Quantity, FeeSats: req.FeeSats}, nil
}

func (a *Adapter) ValidateMoney(amount money.Money) error {
	if amount.Minor <= 0 {
		return errors.New("amount must be positive")
	}
	if strings.TrimSpace(amount.Currency) == "" {
		return errors.New("asset/currency code is required")
	}
	return nil
}

func (a *Adapter) get(ctx context.Context, endpoint string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	return a.do(req)
}

func (a *Adapter) post(ctx context.Context, endpoint string, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return a.do(req)
}

func (a *Adapter) do(req *http.Request) ([]byte, error) {
	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("rail endpoint status=%d", resp.StatusCode)
	}
	return body, nil
}

func validateTxID(txid string) error {
	if len(txid) != 64 {
		return errors.New("transaction id must be 64 hex characters")
	}
	_, err := hex.DecodeString(txid)
	if err != nil {
		return errors.New("transaction id must be hexadecimal")
	}
	return nil
}
