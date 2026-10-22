"""GEM-114: unmounted read-only MCP protocol adapter for NEO Gemini.

Transport/OAuth registration is intentionally NOT enabled. Do not use Gemini
Gem instructions as credentials. No automatic Google conversation scraping.
"""
import json
PROTOCOL="2025-06-18"
TOOLS=[
 {"name":"neo_status","description":"Show NEO MCP integration status; no data writes.","inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
 {"name":"neo_prepare_development","description":"Prepare a development request for operator review. Does not execute changes.","inputSchema":{"type":"object","properties":{"request":{"type":"string","minLength":1,"maxLength":2000}},"required":["request"],"additionalProperties":False}}
]
def respond(message):
 if not isinstance(message,dict) or message.get("jsonrpc")!="2.0":
  return {"jsonrpc":"2.0","id":None,"error":{"code":-32600,"message":"Invalid Request"}}
 method=message.get("method");ident=message.get("id")
 if method=="notifications/initialized":return None
 if method=="initialize":
  return {"jsonrpc":"2.0","id":ident,"result":{"protocolVersion":PROTOCOL,"capabilities":{"tools":{}},"serverInfo":{"name":"neo-gem-private","version":"0.1.0"}}}
 if method=="tools/list":
  return {"jsonrpc":"2.0","id":ident,"result":{"tools":TOOLS}}
 if method=="tools/call":
  params=message.get("params") or {}
  name=params.get("name");args=params.get("arguments") or {}
  if name=="neo_status" and args=={}:
   value={"stage":"staging-only","github_writes":False,"auto_gem_sync":False,"conversation_history_import":False}
  elif name=="neo_prepare_development" and isinstance(args,dict) and isinstance(args.get("request"),str) and 1<=len(args["request"].strip())<=2000 and set(args)=={"request"}:
   value={"request":args["request"].strip(),"state":"awaiting_owner_review","github_writes":False,"deployment":False}
  else:
   return {"jsonrpc":"2.0","id":ident,"error":{"code":-32602,"message":"Invalid tool or arguments"}}
  return {"jsonrpc":"2.0","id":ident,"result":{"content":[{"type":"text","text":json.dumps(value)}],"isError":False}}
 return {"jsonrpc":"2.0","id":ident,"error":{"code":-32601,"message":"Method not found"}}
