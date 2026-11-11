# NCHIP-007 — universal NEO Chips SDK and crystal/Neotherapy measurement research

Software-only prototype. No physical chipset, clinical validation, radio emission, therapy actuation or chain broadcast.

Core device families: core, nous, neotherapy, crystal, energy.
Sensor inputs: temperature (C), magnetic field (microtesla) and acceleration (g).
Sensor range enforcement, simulation-only records, SHA-256 tamper evidence.
Not a digital signature; for authenticity combine with an independently tested authenticated signer and verified identity.
No therapy outputs are implemented. This is not a medical treatment device.

## Material experiments
Control: sensor board without crystal/resin/metal enclosure.
Condition A: same sensor with quartz sample mechanically isolated.
Condition B: same sensor in resin/metal/orgonite-style enclosure.
Record temperature, static/variable magnetic field and vibration at consistent positions and environmental conditions. Use blinded randomized ordering where possible and calibrated instrumentation for physical claims. Test heating, antenna attenuation and insulation independently. No health/clinical conclusions from electromagnetic observations.

## Local verification
`cd hardware/neo-chips && python -m unittest -v test_nchip007.py`

Hosting: ChatGPT-led design; GitHub Codespaces/Actions or self-hosted React UI. Vercel prohibited for this project.
