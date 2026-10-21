"""Read-only anchor evidence adapter. Never signs, broadcasts, or asserts finality from claims."""
from nous_checkpoint import verify_receipt

def evaluate_anchor(receipt, independent_bitcoin_observation, counterparty_observation=None):
    bitcoin_ok=verify_receipt(receipt,independent_bitcoin_observation)
    xcp_ok=False
    if isinstance(counterparty_observation,dict):
        xcp_ok=(counterparty_observation.get("bitcoin_txid")==receipt.get("bitcoin_txid")
                and counterparty_observation.get("commitment_sha256")==receipt.get("commitment_sha256")
                and counterparty_observation.get("source_verified") is True)
    return {"bitcoin_confirmed":bool(bitcoin_ok and receipt.get("anchor_status")=="confirmed"),
            "counterparty_correlated":bool(bitcoin_ok and xcp_ok),
            "independent_consensus_verification_required":True,
            "broadcast_permitted":False}
