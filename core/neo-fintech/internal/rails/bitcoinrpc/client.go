package bitcoinrpc

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Shemsizedek/neo-system/core/neo-fintech/internal/neopayreview"
)

type Config struct {
	URL              string
	Username         string
	Password         string
	HTTPClient       *http.Client
	MaxFeeRateBTCPerKVb string
	MaxBurnAmountBTC string
}

type Client struct {
	endpoint         *url.URL
	username         string
	password         string
	http             *http.Client
	maxFeeRate       string
	maxBurnAmount    string
}

func New(cfg Config) (*Client, error) {
	u, err := url.Parse(strings.TrimSpace(cfg.URL))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil, errors.New("valid Bitcoin Core RPC URL is required")
	}
	if u.Scheme != "https" && !(u.Scheme == "http" && isLoopbackHost(u.Hostname())) {
		return nil, errors.New("Bitcoin Core RPC requires HTTPS except on loopback")
	}
	client := cfg.HTTPClient
	if client == nil { client = &http.Client{Timeout: 15 * time.Second} }
	maxFee := strings.TrimSpace(cfg.MaxFeeRateBTCPerKVb)
	if maxFee == "" { maxFee = "0.10" }
	maxBurn := strings.TrimSpace(cfg.MaxBurnAmountBTC)
	if maxBurn == "" { maxBurn = "0.00" }
	return &Client{endpoint:u, username:cfg.Username, password:cfg.Password, http:client, maxFeeRate:maxFee, maxBurnAmount:maxBurn}, nil
}

func isLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") { return true }
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      string `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params"`
}

type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error *struct {
		Code int `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func (c *Client) call(ctx context.Context, method string, params any, out any) error {
	body, err := json.Marshal(rpcRequest{JSONRPC:"2.0", ID:"neo-fintech", Method:method, Params:params})
	if err != nil { return err }
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint.String(), bytes.NewReader(body))
	if err != nil { return err }
	req.Header.Set("Content-Type", "application/json")
	if c.username != "" || c.password != "" { req.SetBasicAuth(c.username, c.password) }
	resp, err := c.http.Do(req)
	if err != nil { return err }
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 { return fmt.Errorf("Bitcoin Core HTTP status %d", resp.StatusCode) }
	var envelope rpcResponse
	dec := json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 2<<20))
	if err := dec.Decode(&envelope); err != nil { return fmt.Errorf("decode Bitcoin Core RPC response: %w", err) }
	if envelope.Error != nil { return &RPCError{Code:envelope.Error.Code, Message:envelope.Error.Message} }
	if out == nil { return nil }
	if err := json.Unmarshal(envelope.Result, out); err != nil { return fmt.Errorf("decode Bitcoin Core RPC result: %w", err) }
	return nil
}

type RPCError struct { Code int; Message string }
func (e *RPCError) Error() string { return fmt.Sprintf("Bitcoin Core RPC %d: %s", e.Code, e.Message) }

type mempoolAcceptResult struct {
	TxID string `json:"txid"`
	WTxID string `json:"wtxid"`
	Allowed *bool `json:"allowed"`
	VSize int64 `json:"vsize"`
	RejectReason string `json:"reject-reason"`
	RejectDetails string `json:"reject-details"`
}

func (c *Client) TestMempoolAccept(ctx context.Context, signedTx string) (neopayreview.NodeValidation, error) {
	var result []mempoolAcceptResult
	if err := c.call(ctx, "testmempoolaccept", []any{[]string{strings.TrimSpace(signedTx)}, c.maxFeeRate}, &result); err != nil { return neopayreview.NodeValidation{}, err }
	if len(result) != 1 { return neopayreview.NodeValidation{}, errors.New("Bitcoin Core returned unexpected validation result count") }
	if result[0].Allowed == nil { return neopayreview.NodeValidation{}, errors.New("Bitcoin Core did not fully validate transaction") }
	return neopayreview.NodeValidation{TxID:result[0].TxID, WTxID:result[0].WTxID, Allowed:*result[0].Allowed, VSize:result[0].VSize, RejectReason:result[0].RejectReason, RejectDetails:result[0].RejectDetails}, nil
}

func (c *Client) SendRawTransaction(ctx context.Context, signedTx string) (neopayreview.NodeBroadcastResult, error) {
	var txid string
	err := c.call(ctx, "sendrawtransaction", []any{strings.TrimSpace(signedTx), c.maxFeeRate, c.maxBurnAmount}, &txid)
	if err != nil {
		var rpcErr *RPCError
		if errors.As(err, &rpcErr) {
			return neopayreview.NodeBroadcastResult{Outcome:neopayreview.BroadcastNodeRejected, RejectReason:rpcErr.Message}, nil
		}
		return neopayreview.NodeBroadcastResult{}, err
	}
	return neopayreview.NodeBroadcastResult{TxID:txid, Outcome:neopayreview.BroadcastNodeAccepted}, nil
}

func (c *Client) LookupTransaction(ctx context.Context, txid string) (neopayreview.NodeObservation, error) {
	var entry json.RawMessage
	if err := c.call(ctx, "getmempoolentry", []any{txid}, &entry); err == nil {
		return neopayreview.NodeObservation{TxID:txid, State:neopayreview.NodeObservedMempool}, nil
	} else {
		var rpcErr *RPCError
		if !errors.As(err, &rpcErr) { return neopayreview.NodeObservation{}, err }
	}
	var raw json.RawMessage
	if err := c.call(ctx, "getrawtransaction", []any{txid, true}, &raw); err == nil {
		return neopayreview.NodeObservation{TxID:txid, State:neopayreview.NodeObservedChainOrMempool}, nil
	} else {
		var rpcErr *RPCError
		if !errors.As(err, &rpcErr) { return neopayreview.NodeObservation{}, err }
	}
	return neopayreview.NodeObservation{TxID:txid, State:neopayreview.NodeObservationUnknown}, nil
}
