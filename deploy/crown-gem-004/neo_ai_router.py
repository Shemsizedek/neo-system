"""GEM-119 provider-neutral NEO router contracts; no new provider credentials.
All client hints are untrusted. Actual execution stays behind authenticated host.
"""
import re
PROVIDERS=("gemini","openai","neo-oracle")
OPERATIONS=("counterparty.asset.read","bitcoin.tx.read","development.proposal.draft")
def normalize(message,provider="gemini",source=""):
    if provider not in PROVIDERS:raise ValueError("unsupported provider")
    if not isinstance(message,str) or not 1<=len(message.strip())<=2000:raise ValueError("invalid message")
    if not isinstance(source,str) or len(source)>60 or (source and not re.fullmatch("[A-Za-z0-9 _.-]+",source)):raise ValueError("invalid source")
    return {"schema":"neo.ai.request.v1","provider":provider,"source":source or "unlabeled",
            "message":message.strip(),"authenticated":False,"permissions":[]}
def route(operation,authenticated,allowlist):
    if operation not in OPERATIONS:raise ValueError("unsupported operation")
    if authenticated is not True:raise PermissionError("server authentication required")
    if operation not in allowlist:raise PermissionError("operation not permitted")
    return {"operation":operation,"mode":"plan_only","execution_authorized":False}
