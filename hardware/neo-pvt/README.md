# NEO Miner One — PVT / Pilot Manufacturing & Factory System v0.14

## Purpose

PVT converts the DVT-qualified NEO Miner One design into a repeatable pilot-production system. It validates the factory process, fixtures, work instructions, traceability, yields, packaging, service readiness, and release controls required before commercial manufacturing.

PVT does not by itself authorize mass production, regulatory marking, market launch, or shipment into jurisdictions whose requirements are incomplete.

## Objectives

- validate production-intent assembly flow
- prove manufacturing fixtures and end-of-line tests
- establish serial-number and key-provisioning controls
- measure first-pass yield and defect Pareto
- validate takt-time assumptions
- prove approved-vendor and incoming-inspection controls
- validate packaging and shipping protection
- exercise RMA and field-service workflows
- confirm production records are traceable to exact BOM, firmware, calibration, and operator/fixture revisions

## Pilot phases

### PVT0 — Line Bring-Up

Target: 5–10 engineering-controlled units.

Focus:
- station sequencing
- fixture checkout
- work-instruction clarity
- tooling and torque verification
- serial provisioning
- EOL mining-test automation

### PVT1 — Controlled Pilot

Target: 20–50 units.

Focus:
- first-pass yield
- station cycle time
- defect containment
- calibration repeatability
- packaging
- service teardown/reassembly

### PVT2 — Production Simulation

Target: 50–200 units, subject to supplier and budget constraints.

Focus:
- sustained pilot-line operation
- operator variability
- fixture repeatability
- inventory controls
- traceability completeness
- RMA loop closure
- release review

## Factory station model

1. Receiving / Incoming Inspection
2. Controller Board Test
3. Hashboard Incoming Test
4. PSU/PDU Inspection
5. Chassis Preparation
6. Subassembly Build
7. Final Mechanical Assembly
8. Cable / Harness Verification
9. Secure Identity Provisioning
10. Firmware / Software Load
11. Calibration
12. Electrical Safety Pre-Check
13. Power-On Functional Test
14. End-of-Line Mining Test
15. Thermal / Fan Verification
16. Burn-In Sampling
17. Final Quality Audit
18. Label / Serialization Check
19. Packaging
20. Finished-Goods Release

## Factory data requirements

Every unit must record:
- NEO product serial
- MAC/device network identity
- secure-element device identity/public key reference
- controller PCB revision/serial
- hashboard serials and revisions
- PSU/PDU serial and revision
- chassis revision
- fan/cooling module identifiers where serialized
- firmware image hash
- controller software release
- test fixture IDs and revisions
- calibration data
- EOL test result
- operator/station timestamps
- nonconformance and rework history

Private keys must not be exported into factory logs. Provisioning should store public identity references and attestations only.

## End-of-line mining test

The EOL test must verify at minimum:
- boot and controller health
- secure identity present
- network interface operational
- all expected hashboards enumerated
- fans/pumps and sensors available
- power telemetry valid
- safe operating temperature at controlled load
- ASIC-chain communication
- mining-work acceptance from an authorized test pool or isolated test harness
- accepted-share activity or deterministic equivalent test proof
- no unresolved critical alarms

No unit may be marked PASS using simulated telemetry alone.

## Pilot KPIs

Track:
- first-pass yield (FPY)
- rolled throughput yield (RTY)
- defects per unit (DPU)
- defects per million opportunities where appropriate
- station cycle time
- line takt
- rework rate
- scrap rate
- test escape rate
- fixture failure rate
- incoming supplier defect rate
- calibration failure rate
- EOL mining-test failure rate
- packaging defect rate
- early-life/RMA rate

## Initial target gates

Reference engineering targets, to be refined with actual pilot data:
- FPY >= 90% for PVT1
- FPY >= 95% before production release
- zero open safety-critical defects
- zero unapproved compliance-impacting substitutions
- 100% serialization/traceability completeness
- 100% EOL test completion
- 100% secure identity provisioning success or controlled quarantine

## Nonconformance control

Defects must be dispositioned as:
- USE_AS_IS — engineering approval required
- REWORK
- REPAIR
- RETURN_TO_SUPPLIER
- SCRAP
- QUARANTINE

Any safety, security, compliance, or cryptographic-identity failure defaults to QUARANTINE until formally dispositioned.

## Packaging validation

Production-intent packaging must define:
- ESD controls where needed
- moisture/dust protection
- shock/vibration protection
- accessory segregation
- serial/label visibility
- regulatory label space
- installation/service documentation

Shipping tests should be selected based on target logistics and lab guidance; do not claim formal transit certification unless the applicable test program has actually been completed.

## RMA / service loop

The pilot program must exercise:
1. customer/field fault intake
2. serial lookup
3. telemetry/history review
4. return authorization
5. incoming failure verification
6. repair or replacement
7. root-cause coding
8. parts consumption
9. retest
10. disposition
11. fleet-wide corrective action when systemic

## Production release gate

PVT may exit only when:
- pilot build completed against production-intent documentation
- critical stations have controlled work instructions
- fixtures are versioned and validated
- traceability is complete
- yield target is achieved or deviations are formally approved
- top defect Pareto has containment/corrective actions
- EOL test is stable and repeatable
- secure provisioning is controlled
- packaging is validated for intended distribution
- critical suppliers are approved
- unresolved safety/compliance issues are zero
- service/RMA process has been demonstrated
- regulatory requirements for intended launch markets are either completed or explicitly shipment-gated

## Status

Reference / pilot manufacturing architecture. Not yet evidence of a completed physical PVT run.