"""NEO Grok MCP staging gateway. Fail-closed bearer access; no device ADB surface."""
import hmac
import os
import httpx
import uvicorn
from mcp.server.fastmcp import FastMCP

XAI_API_KEY = os.environ.get("XAI_API_KEY", "")
NEO_MCP_TOKEN = os.environ.get("NEO_MCP_TOKEN", "")
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-4")
mcp = FastMCP("NEO Grok Gateway", stateless_http=True, json_response=True)

@mcp.tool()
async def ask_grok(prompt: str, system_prompt: str = "Distinguish verified facts, claims, and unknowns.") -> str:
    """Use xAI Grok for inference; AI results are not independent evidence."""
    if not XAI_API_KEY:
        return "Gateway unconfigured: XAI_API_KEY is missing."
    if not prompt.strip():
        return "Prompt must not be empty."
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                json={"model": XAI_MODEL, "messages": [
                    {"role":"system","content":system_prompt},
                    {"role":"user","content":prompt}
                ], "stream":False})
            response.raise_for_status()
            return str(response.json()["choices"][0]["message"]["content"])
    except httpx.HTTPStatusError as exc:
        return f"xAI returned HTTP {exc.response.status_code}; verify model access, billing, and API key."
    except (httpx.RequestError, KeyError, IndexError, TypeError, ValueError):
        return "xAI request unsuccessful or unexpected response."

class BearerAuth:
    def __init__(self, app):
        self.app = app
    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)
        supplied = dict(scope.get("headers", [])).get(b"authorization", b"").decode("utf-8", "replace")
        valid = bool(NEO_MCP_TOKEN) and hmac.compare_digest(supplied, "Bearer " + NEO_MCP_TOKEN)
        if not valid:
            if scope["type"] == "websocket":
                return await send({"type":"websocket.close","code":1008})
            body=b"Unauthorized"
            await send({"type":"http.response.start","status":401,"headers":[(b"content-type",b"text/plain"),(b"content-length",str(len(body)).encode())]})
            return await send({"type":"http.response.body","body":body})
        return await self.app(scope,receive,send)

app = BearerAuth(mcp.streamable_http_app())
if __name__ == "__main__":
    uvicorn.run(app,host="0.0.0.0",port=int(os.getenv("PORT","10000")))
