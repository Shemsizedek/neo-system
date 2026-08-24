# NEO Miner One — DVT / Compliance & Production-Intent Validation v0.13

Status: ENGINEERING PROGRAM

Purpose: move NEO Miner One from EVT evidence into production-intent validation. DVT does not equal certification, legal approval, or mass-production release. It establishes controlled hardware/software revisions, pre-compliance evidence, manufacturability closure, supplier readiness, and formal exit gates before pilot production.

## DVT objectives

- Freeze production-intent controller, hashboard, power/thermal, chassis, harness, firmware, Miner Agent, Controller OS, and test fixtures.
- Validate safety architecture under representative and fault conditions.
- Run EMC/EMI pre-scan and corrective-action loops before formal laboratory testing.
- Prepare product-safety evidence against the target AV/ICT safety framework selected for each target market.
- Validate environmental, vibration, handling, thermal, acoustic, and reliability behavior.
- Close DFM/DFA and serviceability issues.
- Qualify critical suppliers and second sources where practical.
- Validate production test coverage and traceability.
- Define regulatory and certification plans without falsely claiming certification before independent testing is complete.

## Compliance planning

The product should be treated as digital/ICT equipment with high-frequency switching and computing circuitry. The DVT program must therefore include an EMC/EMI pre-compliance plan for applicable target markets and a product-safety plan based on the current edition/adoption of IEC/UL/CSA 62368-1 or another standard selected by a qualified compliance lab for the actual configuration and market.

Do not print FCC, UL, CSA, CE, CB, UKCA, or other conformity marks until the required conformity route, testing, documentation, and authorization are complete.

## DVT hardware freeze

Each DVT unit must record:

- controller PCB revision
- controller BOM revision
- hashboard PCB revision and ASIC lot
- power/PDU revision
- PSU manufacturer/model/revision
- fan or immersion subsystem revision
- chassis and heatsink revision
- harness revision
- secure-element provisioning profile
- firmware build hash
- Miner Agent version
- Controller OS image hash
- calibration/test fixture revisions

Changes after freeze require an engineering change order and regression-impact review.

## DVT phases

### DVT0 — production-intent engineering units

Purpose: confirm the frozen architecture can be assembled repeatedly using production-intent parts and processes.

Required evidence:

- build yield
- assembly defects
- connector/harness fit
- power-up yield
- secure provisioning yield
- mining bring-up yield
- initial thermal and EMI observations

### DVT1 — pre-compliance units

Purpose: characterize emissions, immunity/susceptibility risks, product-safety safeguards, grounding/bonding, temperature rise, abnormal-operation response, and power behavior.

### DVT2 — environmental/reliability units

Purpose: run extended thermal, vibration, shock/handling, dust/filter, acoustic, burn-in, power-cycle, watchdog, fan/pump fault, network failover, and storage/recovery testing.

### DVT3 — production-intent pilot rehearsal

Purpose: validate assembly instructions, fixture coverage, serial/identity programming, calibration, end-of-line test, packaging, service procedures, rework controls, and traceability before PVT.

## EMC / EMI pre-compliance

Minimum DVT work:

- conducted-emissions pre-scan
- radiated-emissions pre-scan
- clock/harmonic hotspot identification
- PSU and DC-DC switching-noise review
- cable/common-mode current review
- enclosure-seam and aperture review
- Ethernet/common-mode filtering review
- fan/PWM switching review
- grounding/bonding review
- mitigation log with before/after data

Formal applicable limits and test methods must be confirmed with a qualified laboratory for each target market.

## Product-safety preparation

Create a hazard-based safety file covering at least:

- electrical energy sources
- fire/thermal energy sources
- mechanical hazards
- accessible surfaces
- safeguards and interlocks
- abnormal operation
- protective earthing/bonding
- insulation/spacing where applicable
- PSU certification/status
- fan/pump failure behavior
- enclosure/fire containment strategy
- service-person access assumptions
- labels and instructions

The final safety standard and national deviations must be confirmed by the chosen certification path and lab.

## Environmental / mechanical validation

Program should include engineering-defined profiles for:

- operating temperature range
- storage temperature range
- humidity
- fan/filter loading
- rack vibration
- packaged shipping vibration
- handling shock/drop where appropriate
- fastener retention
- connector retention
- heatsink retention
- cable abrasion
- chassis deformation
- ingress/dust exposure appropriate to intended installation

Profiles in this repository are planning values until approved by mechanical/reliability engineering and, where needed, a test laboratory.

## Reliability validation

Track:

- continuous mining hours
- power-cycle count
- watchdog recovery events
- pool failover events
- fan/pump fault response
- thermal-throttle events
- emergency shutdown events
- filesystem/storage recovery
- OTA update/rollback behavior
- telemetry continuity
- hashboard fault isolation

No unreviewed thermal or electrical protection bypass is allowed for reliability testing.

## DFM / DFA closure

Before DVT exit:

- BOM must have lifecycle and availability review.
- Critical components should have approved sources.
- PCB stackups, tolerances, assembly notes, and inspection criteria must be production-intent.
- Harness drawings and pinout controls must be released.
- Mechanical drawings must define critical dimensions/tolerances.
- Torque values and thread-locking policy must be specified.
- Test points must be accessible to production fixtures.
- Rework and repair limits must be documented.

## Supplier qualification

Critical supplier records should capture:

- legal manufacturer name
- manufacturing location
- part number/revision
- approved alternates
- lifecycle status
- lead time
- incoming inspection plan
- certificates/reports where applicable
- change-notification requirements
- lot traceability expectations

## Production test readiness

Every unit should receive a serialized DVT/PVT-compatible record linking:

serial -> BOM revision -> board revisions -> secure identity -> firmware -> calibration -> test results -> disposition

Production test coverage should include:

- visual/assembly inspection
- rail and current checks
- secure-element identity
- Ethernet/controller boot
- fan/PWM/tach test
- thermal-sensor test
- hashboard enumeration
- controlled mining test
- telemetry accuracy
- emergency shutdown path
- final configuration lock

## DVT exit gate

DVT may exit only when:

- all BLOCKER issues are closed
- all MAJOR issues are closed or formally waived by engineering/compliance leadership
- production-intent revisions are frozen
- pre-compliance EMC evidence is acceptable for formal test submission
- safety review has no unresolved unacceptable hazards
- environmental/reliability matrix is complete or has approved residual risk
- pilot assembly and end-of-line test are repeatable
- supplier qualification is complete for critical parts
- traceability is end-to-end
- certification plan and target markets are approved

DVT exit authorizes PVT/pilot-production preparation only. It does not authorize market sale or use of compliance marks.