"""NCHIP-002: NEO Chips reference simulator. No physical hardware or on-chain writes."""
import hashlib
import json
from dataclasses import dataclass

DOMAIN = "NEO-CHIP/NCHIP-002/v1"


def canonical(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def digest_event(event):
    if not isinstance(event, dict) or not event:
        raise ValueError("event must be a nonempty JSON object")
    return hashlib.sha256(DOMAIN.encode() + b"\0" + canonical(event)).hexdigest()


@dataclass
class NeoChip:
    device_id: str
    sequence: int = 0

    def execute(self, event, signer):
        """Simulate a deterministic hardware transaction, signed by injected signer.

        signer must be an Ed25519PrivateKey-like object; use TEST keys only.
        No key is written to disk and no blockchain transaction is submitted.
        """
        self.sequence += 1
        payload = {
            "protocol": DOMAIN,
            "device_id": self.device_id,
            "sequence": self.sequence,
            "event_sha256": digest_event(event),
            "status": "simulated",
        }
        signature = signer.sign(canonical(payload))
        return {"payload": payload, "signature_hex": signature.hex()}


def verify(record, public_key):
    """Verify record signature; caller must authenticate the public-key identity."""
    try:
        public_key.verify(bytes.fromhex(record["signature_hex"]), canonical(record["payload"]))
        return record["payload"]["protocol"] == DOMAIN
    except (ValueError, TypeError, KeyError, AttributeError):
        return False
    except Exception:
        return False


if __name__ == "__main__":
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    key = Ed25519PrivateKey.generate()
    chip = NeoChip("NEO-DEV-SIM-001")
    report = chip.execute({"kind": "sensor", "value": 42}, key)
    assert verify(report, key.public_key())
    report["payload"]["sequence"] = 999
    assert not verify(report, key.public_key())
    print("PASS: deterministic hashing, Ed25519 signature, tamper rejection")
