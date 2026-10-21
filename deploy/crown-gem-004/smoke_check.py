"""Read-only smoke verifier; requires CROWN_BRIDGE_URL and CROWN_BRIDGE_TOKEN as environment secrets."""
import json, os, sys, urllib.request, urllib.error
from urllib.parse import urlparse
base=os.getenv("CROWN_BRIDGE_URL","").rstrip("/")
token=os.getenv("CROWN_BRIDGE_TOKEN","")
txid=os.getenv("CROWN_SAMPLE_TXID","")
asset=os.getenv("CROWN_SAMPLE_ASSET","")
if urlparse(base).scheme!="https" or len(token)<32:
    print("BLOCKED: URL/token not configured"); sys.exit(2)
def read(path):
    req=urllib.request.Request(base+path,headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=15) as r: return r.status,json.load(r)
    except urllib.error.HTTPError as e: return e.code,{}
status,data=read("/health")
print("health",status,"read_only",data.get("mode")=="read-only")
if status!=200 or data.get("mode")!="read-only":sys.exit(1)
if len(txid)==64 and all(c in "0123456789abcdefABCDEF" for c in txid):
    status,data=read("/v1/bitcoin/tx/"+txid)
    result=data.get("data")
    ok=status==200 and isinstance(result,dict) and result.get("txid","").lower()==txid.lower()
    print("bitcoin",status,"transaction_match",ok)
    if not ok:sys.exit(1)
else:
    print("BLOCKED: valid Bitcoin sample transaction required"); sys.exit(2)
if asset and asset.replace(".","").isalnum():
    status,data=read("/v1/counterparty/asset/"+asset)
    print("counterparty",status,"returned_json",isinstance(data.get("data"),(dict,list)))
    if status!=200 or not isinstance(data.get("data"), (dict,list)):
        sys.exit(1)
else:
    print("BLOCKED: valid Counterparty sample asset required"); sys.exit(2)
