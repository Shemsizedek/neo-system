"""Explicit one-shot Gemini developer API diagnostic, never part of web startup.
Run only in an authorized private staging job with the existing Render secrets.
No credentials, generated content or external payloads are printed.
"""
import json
import os
import sys
import time

def main():
    from gemini_runtime import run
    checks=[("xcp","Use neo_crown_counterparty_asset to look up XCP."),
            ("btc","Use neo_crown_bitcoin_transaction to look up 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b.")]
    for label,prompt in checks:
        started=time.monotonic()
        try:
            result=run(prompt)
            expected="neo_crown_counterparty_asset" if label=="xcp" else "neo_crown_bitcoin_transaction"
            outcome={"check":label,"tool_called":expected in result.get("used_tools",[]),
                     "certified":False,"duration_seconds":round(time.monotonic()-started,2)}
        except Exception as error:
            outcome={"check":label,"tool_called":False,"certified":False,
                     "error_type":type(error).__name__,"duration_seconds":round(time.monotonic()-started,2)}
        print("GEMINI_NEO_DIAGNOSTIC "+json.dumps(outcome),flush=True)
if __name__=="__main__":
    main()
