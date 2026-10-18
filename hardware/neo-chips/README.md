# NCHIP-002 — NEO Chips simulator

Reference demonstrator for the NEO Nous hardware abstraction boundary. This is a **software-only simulation**, not a fabricated chip, FPGA bitstream, HSM, or Crown Chain transaction.

## Local validation

```bash
python -m pip install cryptography>=42
python hardware/neo-chips/nchip002_simulator.py
```

Expected output: `PASS: deterministic hashing, Ed25519 signature, tamper rejection`.

## Contract

- Canonical JSON event → SHA-256 domain-separated digest.
- Monotonically increasing sequence number (in memory only).
- Ed25519 test signature over canonical attestation metadata.
- Verification rejects modified records.
- Signer is injected; production key management, replay-proof persistence, secure boot, on-chain anchoring, and device identity enrollment are **not implemented**.
- Python `cryptography` package required for demonstration.

## Next acceptance gates

1. Run CI in a controlled Python environment.
2. Negative tests for altered payload, altered signature and wrong key.
3. Bind attestation verifier to NEO Nous OS HAL contract.
4. FPGA proof-of-concept, hardware root of trust, persistent anti-replay and signed firmware.
5. Crown Chain anchoring only after separate authorization and testnet verification.

See tracking issue #1015.
