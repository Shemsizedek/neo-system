# NEO Miner One — EVT Prototype & Validation Program v0.12

Status: ENGINEERING VALIDATION FRAMEWORK

This directory defines the Engineering Validation Test (EVT) program for NEO Miner One. It converts the controller, hashboard, power/thermal, and chassis reference architectures into a controlled prototype build and validation process.

## EVT objectives

EVT must demonstrate that a prototype system can be assembled reproducibly and operate safely under controlled engineering conditions before any DVT/PVT or commercial-production claim is made.

The EVT program validates:

- controller-board integration
- hashboard communication and identity
- power-domain behavior
- thermal performance
- cooling control
- telemetry accuracy
- watchdog and recovery behavior
- fault handling and emergency shutdown
- Miner Agent / Controller integration
- pool connectivity and mining telemetry
- chassis airflow and serviceability
- acoustic behavior
- burn-in reliability
- OTA/update recovery
- manufacturing test coverage

## Prototype build stages

1. **EVT0 — Benchtop bring-up**
   - controller only
   - no production chassis requirement
   - lab supply and controlled loads
   - interface verification

2. **EVT1 — Functional mining prototype**
   - controller + commercial ASIC hashboards
   - prototype PDU / qualified PSU
   - temporary thermal fixtures acceptable
   - verify mining workload, telemetry, safety state machine

3. **EVT2 — Integrated mechanical prototype**
   - chassis prototype
   - production-intent fan positions
   - representative harnessing
   - production-intent heatsink mounting
   - acoustics and airflow validation

4. **EVT3 — Reliability prototype**
   - controlled BOM revision
   - burn-in
   - fault injection
   - repeated cold/hot starts
   - OTA recovery
   - serviceability cycle testing

## Required design inputs

The build owner must freeze versioned inputs for each prototype lot:

- controller hardware revision
- controller firmware/OS revision
- Miner Agent revision
- hashboard revision / vendor profile
- ASIC device family
- PSU/PDU revision
- cooling configuration
- chassis revision
- cable/harness revision
- test fixture revision
- test software revision

No prototype result is valid without traceability to these revisions.

## EVT BOM freeze

The EVT BOM is not a production BOM. It is a controlled prototype BOM.

Each line item must contain:

- internal part number
- manufacturer
- manufacturer part number
- description
- quantity
- lifecycle status
- approved substitute policy
- supplier/source
- revision
- risk classification
- qualification status

Critical components include:

- controller compute module / SoC module
- secure element / TPM-class device
- watchdog
- eMMC/NVMe storage
- Ethernet PHY/magnetics
- PSU/PDU components
- current/voltage sensing
- fan drivers
- fans/pumps
- temperature sensors
- harness/connectors
- hashboard interface parts
- heatsinks / thermal interface material

## PCB / board fabrication package requirements

Where NEO-designed PCBs are used, the EVT package must include:

- schematic source
- PCB source
- Gerbers or ODB++
- drill files
- stackup
- impedance requirements
- fabrication notes
- assembly drawing
- pick-and-place
- centroid file
- BOM
- approved alternates
- test-point drawing
- programming instructions

## Mechanical deliverables

The EVT mechanical package should include:

- 3D CAD source
- STEP export
- 2D critical-dimension drawings
- fan cutouts
- heatsink mounting geometry
- hashboard rail geometry
- controller mounting geometry
- PSU/PDU mounting geometry
- rack-ear geometry
- cable/harness routing drawing
- service-clearance drawing
- filter installation drawing
- grounding/bonding locations

## Assembly traveler

Each EVT unit receives a unique serial and build traveler.

Suggested identity:

`NEO-EVT-[LOT]-[UNIT]`

The traveler records:

- lot
- unit serial
- assembly date
- technician
- component revisions
- firmware image hash
- key-provisioning status
- test results
- deviations
- rework
- final disposition

## Test domains

### Electrical bring-up

Verify:

- no-short / resistance checks before energization
- low-voltage rails
- controller boot
- Ethernet
- secure identity
- watchdog
- temperature sensors
- fan PWM/tach
- hashboard communication
- branch current telemetry

### Power testing

Measure:

- input power
- branch power
- controller power
- total system power
- conversion efficiency where measurable
- current-balance behavior
- transient response
- brownout / recovery behavior

Do not bypass PSU or PDU hardware protections.

### Thermal testing

Test representative load conditions:

- idle
- 25%
- 50%
- 75%
- 100%
- throttling threshold
- controlled emergency threshold

Record:

- ambient inlet temperature
- outlet temperature
- ASIC zones
- VRM zones
- connector zones
- controller temperature
- fan/pump state
- thermal-state transitions

### Airflow validation

Use smoke/flow visualization or suitable instrumentation to identify:

- bypass airflow
- recirculation
- dead zones
- filter restriction
- heatsink imbalance

### Acoustic validation

Measure sound pressure under defined conditions and record:

- distance
- room/ambient baseline
- operating mode
- fan RPM
- system load

EVT acoustic data is characterization data, not a certification claim.

### Mining functional validation

Verify:

- hashboard enumeration
- ASIC initialization
- pool connection
- worker assignment
- accepted/rejected share counters
- telemetry consistency
- delivered hashrate
- failover to backup pool where configured

### Burn-in

EVT3 target burn-in should include a controlled continuous run long enough to expose infant failures. Exact duration is a program variable and must be recorded per lot.

Track:

- uptime
- hashrate drift
- temperature drift
- rejected-share rate
- fan/pump stability
- board resets
- controller resets
- watchdog events
- PSU/PDU alarms

### Fault injection

Controlled test cases may include:

- one fan failure
- blocked/restricted airflow
- high temperature sensor input
- one hashboard communication failure
- one branch undervoltage/telemetry fault
- Miner Agent crash
- Controller child-process crash
- network disconnect
- pool disconnect
- corrupted OTA package

Fault injection must not defeat certified hardware safety mechanisms or intentionally create uncontrolled mains/high-current hazards.

### OTA / recovery

Validate:

- valid signed package staging
- invalid signature rejection
- invalid hash rejection
- interrupted update recovery strategy
- rollback or known-good recovery mechanism where implemented

## Data capture

Every result must capture:

- unit serial
- lot
- hardware revision
- software revision
- fixture revision
- timestamp
- operator
- measurement tool
- measurement result
- pass/fail
- notes/deviations

## EVT issue classes

- **BLOCKER** — unsafe condition, fundamental architecture failure, uncontrolled reset, corrupted identity, unbounded thermal/power behavior
- **MAJOR** — functionality or reliability below requirement; must be resolved before EVT exit
- **MINOR** — non-critical issue with documented disposition
- **OBSERVATION** — characterization item, not currently a requirement failure

## EVT exit criteria

EVT may exit only when:

- all mandatory tests have been executed on the required sample set
- zero open BLOCKER issues remain
- zero unapproved MAJOR issues remain
- safety shutdown paths are demonstrated
- mining function is stable under representative load
- telemetry is within defined tolerances
- controller recovery is demonstrated
- BOM/design revisions are traceable
- mechanical and thermal issues have documented dispositions
- the engineering team approves transition to DVT planning

EVT exit does **not** mean production-ready, certified, UL-listed, CE-marked, FCC-compliant, or commercially qualified.

## Next gate

After successful EVT exit, the next program is DVT — Design Validation Test — with production-intent design, compliance pre-scan, environmental testing, reliability expansion, manufacturability closure, and tighter statistical acceptance criteria.
