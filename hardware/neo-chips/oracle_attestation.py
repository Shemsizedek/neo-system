"""NCHIP-005. Signed NEO Oracle records and Bitcoin-style OFF-CHAIN commitments."""
import hashlib, json
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

DOMAIN = "NEO-ORACLE/ATTESTATION/v1"
ANCHOR_PREFIX = b"NEO-ORACLE-BTC-ANCHOR/v1\x00"

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False, ensure_ascii=False).encode()

def sha256d(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def produce(model_id, prompt_digest, output_digest, evidence_digest, signer, nonce):
    if not isinstance(model_id, str) or not model_id or not isinstance(nonce, str) or not nonce:
        raise ValueError("model_id and nonce are required")
    for value in (prompt_digest, output_digest, evidence_digest):
        if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError("expected lowercase SHA-256 hex")
    record = {"domain":DOMAIN,"model_id":model_id,"prompt_sha256":prompt_digest,
              "output_sha256":output_digest,"evidence_sha256":evidence_digest,
              "nonce":nonce,"mode":"off-chain-simulation"}
    sig = signer.sign(canonical(record))
    commitment = sha256d(ANCHOR_PREFIX + canonical(record) + sig).hex()
    return {"record":record,"signature_hex":sig.hex(),"candidate_anchor_sha256d":commitment,"broadcast":False}

def verify(packet, trusted_public_key):
    try:
        record = packet["record"]
        if record["domain"] != DOMAIN or record["mode"] != "off-chain-simulation" or packet["broadcast"] is not False:
            return False
        signature = bytes.fromhex(packet["signature_hex"])
        trusted_public_key.verify(signature, canonical(record))
        return sha256d(ANCHOR_PREFIX + canonical(record) + signature).hex() == packet["candidate_anchor_sha256d"]
    except Exception:
        return False

if __name__ == "__main__":
    import copy
    signer = Ed25519PrivateKey.generate()
    d = lambda s: hashlib.sha256(s.encode()).hexdigest()
    packet = produce("NEO-Oracle-sim-0.1",d("prompt"),d("answer"),d("evidence"),signer,"test-001")
    assert verify(packet,signer.public_key())
    changed = copy.deepcopy(packet)
    changed["record"]["model_id"] = "other"
    assert not verify(changed,signer.public_key())
    assert not verify(packet,Ed25519PrivateKey.generate().public_key())
    changed = copy.deepcopy(packet)
    changed["candidate_anchor_sha256d"] = "0"*64
    assert not verify(changed,signer.public_key())
    print("PASS: signed evidence and tamper rejection; no Bitcoin broadcast")
