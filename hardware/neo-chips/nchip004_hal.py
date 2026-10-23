"""NEO Nous OS simulated hardware abstraction interface. No real I/O or chain writes."""
from dataclasses import dataclass, field
from nchip002_simulator import NeoChip, verify, DOMAIN, digest_event

class ReplayError(ValueError):
    pass

@dataclass
class NousHAL:
    device_id: str
    chip: NeoChip = field(init=False)
    last_verified_sequence: int = 0

    def __post_init__(self):
        if not isinstance(self.device_id, str) or not self.device_id:
            raise ValueError("device_id required")
        self.chip = NeoChip(self.device_id)

    def submit(self, event, signer):
        """An in-process software device; signer must be a test-only Ed25519 key."""
        return self.chip.execute(event, signer)

    def accept(self, record, trusted_public_key):
        """Verify identity-bound payload signature and strictly increasing sequence.

        Anti-replay state is intentionally RAM-only, for simulator testing.
        """
        if not verify(record, trusted_public_key):
            raise ValueError("signature invalid")
        payload = record["payload"]
        if payload["device_id"] != self.device_id or payload["status"] != "simulated":
            raise ValueError("wrong device or execution status")
        seq = payload["sequence"]
        if type(seq) is not int or seq <= self.last_verified_sequence:
            raise ReplayError("replayed or invalid sequence")
        if type(payload.get("event_sha256")) is not str or len(payload["event_sha256"]) != 64:
            raise ValueError("invalid event digest")
        self.last_verified_sequence = seq
        return {"accepted": True, "sequence": seq, "event_sha256": payload["event_sha256"], "chain_anchored": False}
