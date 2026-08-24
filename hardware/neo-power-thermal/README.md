# NEO Mining Power & Thermal Platform v0.10

## Purpose

Define the electrical power-distribution, thermal-control, emergency-shutdown, energy-metering, and heat-recovery architecture used by NEO Miner One and future NEO mining appliances.

This layer does **not** define building mains wiring, utility interconnection, or field-installation procedures. Those must be designed, installed, and certified by qualified professionals under applicable electrical, fire, and product-safety codes.

## System boundary

```text
Facility AC / certified upstream distribution
        |
        v
Certified PSU / rectifier stage
        |
        v
Low-voltage high-current DC bus
        |
        +--> Hashboard A
        +--> Hashboard B
        +--> Hashboard C
        +--> Controller auxiliary rails
        |
        v
Power telemetry + thermal telemetry
        |
        v
NEO Miner Controller
        |
        v
NEO Miner Cloud / Economics Engine
```

## Core design goals

- modular PSU/PDU architecture
- isolated telemetry and control planes
- per-hashboard current and voltage measurement
- fault-tolerant cooling control
- deterministic emergency shutdown behavior
- air and immersion cooling profiles
- facility-grade energy accounting
- heat-recovery integration points
- fail-safe local control if the cloud is unavailable
- compatible telemetry contract for mining economics

## Electrical architecture

### Upstream power

Production systems should use commercially certified power supplies or rectifier systems appropriate to the deployment class. The NEO controller and hashboards consume low-voltage DC downstream of that stage.

### DC distribution

Recommended logical domains:

- `DC_BUS_MAIN` — high-current feed for hashboards
- `AUX_12V` — fans, pumps, relay drivers, auxiliaries
- `AUX_5V` — controller peripherals
- `LOGIC_3V3` — logic and sensors

Each hashboard branch should support:

- branch current measurement
- branch voltage measurement
- branch enable/disable control through a properly rated power stage
- overcurrent indication
- overtemperature input
- fault latch
- board-presence detection

No software command should be able to bypass local hardware overcurrent or overtemperature protection.

## Power telemetry

Required metrics:

- input voltage
- input current
- total DC power
- per-hashboard voltage
- per-hashboard current
- per-hashboard power
- controller/auxiliary power
- cumulative energy (Wh / kWh)
- power-supply status
- DC bus status
- efficiency estimate

Telemetry cadence may differ by signal class. Fast local safety loops must not depend on cloud round-trips.

## Cooling modes

### Air cooling

Support:

- minimum 4 PWM fan channels
- fan tachometer feedback
- inlet temperature
- outlet temperature
- controller temperature
- hashboard zone temperatures
- dynamic fan curve
- fan-failure detection
- fail-safe full-speed mode

A lost controller signal should default to a cooling-safe state where practical.

### Immersion cooling

Support optional interfaces for:

- coolant inlet temperature
- coolant outlet temperature
- tank temperature
- pump status
- pump speed
- flow sensor
- pressure differential sensor
- leak detector
- heat-exchanger temperature
- secondary-loop temperature

Immersion mode requires a separate validated mechanical and fluid-compatibility design.

## Thermal zones

Recommended logical zones:

1. inlet air / coolant
2. controller electronics
3. hashboard A
4. hashboard B
5. hashboard C
6. PSU / rectifier telemetry boundary
7. outlet / exhaust
8. optional heat exchanger

Each zone should support configurable thresholds:

- normal
- warning
- throttle
- critical
- emergency shutdown

## Emergency state machine

```text
NORMAL
  |
  +--> WARNING
  |      |
  |      +--> THROTTLE
  |               |
  |               +--> RECOVER
  |               |
  |               +--> SHUTDOWN_REQUIRED
  |
  +--> CRITICAL ----------------> SHUTDOWN_REQUIRED
                                  |
                                  v
                               LATCHED
                                  |
                                  v
                           AUTHORIZED_RESET
```

Emergency shutdown triggers may include:

- hashboard critical temperature
- controller critical temperature
- cooling failure
- pump failure in immersion mode
- leak detection
- overcurrent
- DC bus overvoltage/undervoltage outside safe limits
- repeated watchdog reset condition

Cloud connectivity loss alone should not shut down a healthy miner; the local controller retains safety authority.

## Power control policy

Operating modes:

- `PERFORMANCE`
- `BALANCED`
- `EFFICIENCY`
- `LOW_POWER`
- `STANDBY`
- `EMERGENCY_OFF`

The controller may request frequency/voltage changes only through the supported hashboard HAL. Hardware protection limits remain authoritative.

## Energy economics contract

The NEO Miner economics layer should receive:

- interval energy consumed (kWh)
- current power (W)
- average power (W)
- delivered hashrate (TH/s)
- J/TH
- electricity rate
- time-of-use tariff identifier
- cooling overhead
- facility overhead allocation

Derived metrics include:

- electricity cost / hour
- electricity cost / day
- electricity cost / TH
- electricity cost / BTC
- cooling overhead percentage
- all-in facility energy cost

## Heat recovery

Provide optional telemetry and control references for waste-heat utilization such as:

- hot-water loop
- building heating
- greenhouse heating
- process heat
- heat exchanger export

Track:

- estimated thermal output
- coolant/air delta-T
- recovered thermal energy
- recovery-system availability

Heat recovery is an efficiency feature, not a substitute for properly engineered cooling and safety systems.

## Safety principles

- hard protection cannot depend on software
- remote commands cannot defeat local safety limits
- branch isolation should be possible without dropping the controller
- emergency states are auditable
- restart after a hard safety event requires explicit policy/authorization
- field wiring must follow applicable electrical and fire codes
- production PSU/PDU assemblies require appropriate certification and enclosure design

## Future revisions

- redundant PSUs / rectifiers
- hot-swap power modules
- rack PDU integration
- Modbus/CAN facility interfaces
- utility demand-response controls
- direct liquid cooling
- advanced immersion plant orchestration
- heat-recovery accounting
- renewable-energy dispatch integration
