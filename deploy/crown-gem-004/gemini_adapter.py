"""Gemini developer API function-calling adapter. No direct consumer Gem connection.

Runs outside the model in a trusted application. Never put the bridge token in prompts,
Gem instructions or the user-facing tool response.
"""
import json
import os
import urllib.request

BRIDGE_URL = os.getenv("CROWN_BRIDGE_URL", "").rstrip("/")
TOKEN = os.getenv("CROWN_BRIDGE_TOKEN", "")

TOOL_DECLARATIONS = [{
    "name": "neo_crown_bitcoin_transaction",
    "description": "Read a Bitcoin mainnet transaction through the authenticated NEO Crown bridge; result is third-party sourced, not independent title or ownership proof.",
    "parameters": {
        "type": "OBJECT",
        "properties": {"txid": {"type": "STRING", "description": "64-character hexadecimal Bitcoin transaction ID"}},
        "required": ["txid"]
    }
}, {
    "name": "neo_crown_counterparty_asset",
    "description": "Look up publicly reported Counterparty asset metadata through the authenticated NEO Crown bridge.",
    "parameters": {
        "type": "OBJECT",
        "properties": {"asset": {"type": "STRING", "description": "Counterparty asset name"}},
        "required": ["asset"]
    }
}]

def call_crown_tool(name, args):
    if not BRIDGE_URL.startswith("https://") or len(TOKEN) < 32:
        raise RuntimeError("NEO Crown bridge client is not configured")
    if name == "neo_crown_bitcoin_transaction":
        import re
        ident = args.get("txid","")
        if not isinstance(ident,str) or not re.fullmatch("[0-9a-fA-F]{64}",ident):
            raise ValueError("invalid transaction ID")
        path = "/v1/bitcoin/tx/" + ident
    elif name == "neo_crown_counterparty_asset":
        import re
        ident = args.get("asset","")
        if not isinstance(ident,str) or not re.fullmatch("[A-Z][A-Z0-9.]{0,31}",ident):
            raise ValueError("invalid asset name")
        path = "/v1/counterparty/asset/" + ident
    else:
        raise ValueError("unsupported NEO Crown function")
    req = urllib.request.Request(BRIDGE_URL + path, headers={"Authorization":"Bearer "+TOKEN,"Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        body=resp.read(524289)
        if len(body)>524288: raise RuntimeError("response too large")
        return json.loads(body)
