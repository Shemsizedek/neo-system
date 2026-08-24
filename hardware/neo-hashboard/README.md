# NEO Hashboard Reference Architecture v0.9

## Purpose

Define a modular SHA-256 hashboard carrier that can be driven by NEO Miner Controller hardware while initially using commercially available Bitcoin-mining ASICs. This is a reference architecture, not a claim of proprietary silicon.

## Design goals

- vendor-neutral ASIC-chain carrier
- deterministic controller interface
- per-board identity and telemetry
- fault isolation and safe shutdown
- serviceable thermal design
- production testability
- future migration path to NEO ASIC silicon

## Functional blocks

1. ASIC chain(s)
2. clock / reset distribution
3. core-voltage conversion
4. auxiliary rails
5. board temperature sensing
6. input voltage/current telemetry
7. local board identity EEPROM/secure ID
8. controller interface
9. fan/thermal coordination hooks
10. test/debug connector

## Controller interface

The controller-to-hashboard boundary must expose a normalized logical interface independent of the ASIC vendor. Revision A should support one or more of:

- SPI
- UART-class serial
- GPIO reset/enable
- I2C board-management bus

The exact physical protocol is selected per ASIC family through an adapter mezzanine or board variant.

## ASIC chain model

Each board is divided into one or more independently observable ASIC chains. Each chain records:

- chain_id
- ASIC count
- expected ASIC count
- clock target
- voltage target
- measured hashrate
- hardware-error count
- temperature summary
- operational state

A failed chain must not silently invalidate telemetry from healthy chains.

## Power architecture

The hashboard receives high-current DC from a separately engineered PSU/power-distribution subsystem. The board then creates the ASIC core and auxiliary voltage domains.

Required safeguards:

- input fuse or coordinated protection
- reverse-polarity / ideal-diode strategy where appropriate
- inrush management
- per-board current measurement
- over-current protection
- over-temperature protection
- under-voltage lockout
- controlled enable/disable

High-current power conversion must be designed and validated by qualified power-electronics engineers.

## Telemetry

Minimum board telemetry:

- input_voltage_v
- input_current_a
- input_power_w
- core_voltage_v
- board_temperature_c
- hottest_sensor_c
- chain_count
- active_chain_count
- reported_hashrate_th
- hardware_error_rate
- board_uptime_seconds
- board_id
- board_revision
- firmware_profile

## Thermal design

The board must support heatsink or cold-plate mechanical interfaces. Temperature sensing must include multiple physical zones across the ASIC field, not only one ambient sensor.

Thermal policy:

- warning threshold
- throttle threshold
- emergency shutdown threshold
- hysteresis before restart

The NEO Miner Controller owns policy; the hashboard hardware must still fail safe if the controller disappears.

## Clocking

Clock generation/distribution must support:

- configurable ASIC clock target
- clean reference source
- controlled startup
- per-chain enable where supported
- profile limits stored by board/ASIC revision

Overclocking is not a default operating mode. Profiles must enforce validated voltage/frequency limits.

## Board identity

Every production hashboard receives a unique immutable identity record including:

- hashboard_id
- hardware_revision
- ASIC_family
- production_lot
- manufacture_date
- factory_test_result

Identity data should be readable by the NEO Miner Controller without powering the ASIC core rail when practical.

## Fault model

States:

- OFFLINE
- INITIALIZING
- HEALTHY
- DEGRADED
- THROTTLED
- FAULT
- SHUTDOWN
- MAINTENANCE

Fault causes include:

- missing ASICs
- chain communication loss
- over-temperature
- over-current
- under-voltage
- clock failure
- excessive hardware errors
- sensor failure

## Manufacturing test

Factory fixtures must support:

1. board identity programming
2. continuity and short test
3. auxiliary-rail validation
4. core-rail validation under controlled load
5. controller communication
6. temperature sensor validation
7. ASIC enumeration
8. low-frequency hashing test
9. nominal hashing test
10. thermal soak
11. telemetry validation
12. final signed test record

## Migration path

Revision A: commercial ASICs on NEO carrier / adapter boards.

Revision B: NEO-optimized power, clock, telemetry and thermal design.

Revision C: proprietary NEO SHA-256 ASIC when economically and technically justified.

## Safety boundary

This reference deliberately avoids mains-voltage design. The PSU, high-voltage input, certification, and facility electrical installation are separate engineering workstreams.
