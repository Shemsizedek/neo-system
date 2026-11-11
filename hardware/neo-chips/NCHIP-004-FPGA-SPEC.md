# NCHIP-004 — NEO Nous OS HAL and FPGA feasibility boundary

## Status
Software simulator design; NOT FPGA-verified, fabricated, synthesized, taped out or deployed. No Vercel use intended.

## Module boundary
- NEO Nous OS software -> HAL.submit(event, injected Ed25519 signer)
- Digest: domain-separated canonical JSON SHA-256 inherited from NCHIP-002.
- Device-specific signed attestation carries device ID, sequence, event digest and simulated execution status.
- HAL.accept(record, trusted public key) rejects bad signatures, cross-device records and duplicate/out-of-order sequences.
- HAL state is **volatile**: process restart resets sequence counters, and replay protection cannot be trusted across restarts. Persistent, rollback-resistant monotonic state is required before any production security claim.
- Crown Chain adapter: **not implemented**; only a local `chain_anchored: false` field appears in results.

## FPGA reference design target
1. RISC-V RV32I soft core on a commonly supported education FPGA board.
2. UART framed command transport with CRC and strict input length bounds.
3. Memory-mapped SHA-256 peripheral or firmware fallback, deterministic known-answer vectors.
4. Verified boot and key isolation are separate *future* hardware tasks; never store live keys in FPGA bitstreams.
5. FPGA testbench: reset, valid vector, malformed frame, replay, overflow, cross-device attribution; capture reproducible timing/resource use.
6. Signed records verified on host until silicon key storage and side-channel evaluation are available.

## Acceptance and execution
From `hardware/neo-chips`:
```bash
python -m pip install 'cryptography>=42,<48'
python -m unittest -v test_nchip004.py
```
Pass criteria: all seven Python tests green; separately validate GitHub CI before merging. No claims of physical device measurements or electrical electromagnetic experimentation.

## NEO IP research boundary
Separate transistor-semiconductor physics from use of quartz oscillators, GaN/SiC power electronics and lithium-niobate photonics. Any claimed novel crystal computation requires reproducible device measurements and prior-art assessment.
