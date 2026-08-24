# NEO Miner One — Hardware Reference Platform v0.8

NEO Miner One is the first hardware reference platform for NEO MINER — ORIGIN. It is a controller appliance, not a proprietary SHA-256 ASIC. It is designed to manage one or more compatible hashboards/miners through the NEO Miner Agent and NEO Miner Controller stack.

## Design goals

- Industrial Linux controller capable of running NEO Miner Controller and NEO Miner Agent
- Gigabit Ethernet as the primary production network interface
- Hardware root of trust for device identity, signed events, secure boot support, and key isolation
- Independent hardware watchdog
- eMMC/NVMe-class nonvolatile storage
- 4-pin PWM fan control with tachometer feedback
- I2C/SPI/UART/GPIO expansion for thermal, power, and hashboard interfaces
- Isolated/level-shifted hashboard control interfaces where required by the attached miner family
- Board and enclosure thermal monitoring
- Service UART and USB recovery interface
- Production test points and fixture-friendly connectors
- Fail-safe outputs: loss of controller software must not force unsafe fan or power behavior

## Reference architecture

```text
24V/12V AUX INPUT
     |
     +--> protection / filtering
     |
     +--> 5V buck ---> compute module / USB / Ethernet
     |
     +--> 3.3V buck -> secure element / sensors / logic
     |
     +--> fan power rail --------------------+
                                             |
Gigabit Ethernet --> Compute Module          |
                      |                      |
                      +--> Secure Element    |
                      +--> Watchdog          |
                      +--> eMMC / NVMe       |
                      +--> Temp Sensors      |
                      +--> PWM/Tach ----------+
                      +--> UART/SPI/I2C/GPIO --> Hashboard Interface
                      +--> Service USB/UART
```

## Compute module

The production carrier shall support a replaceable ARM64 compute module rather than soldering the application processor directly onto revision A hardware. Minimum requirements:

- 4-core 64-bit ARM CPU
- 4 GB RAM minimum; 8 GB preferred for fleet/gateway workloads
- eMMC or NVMe boot support
- Gigabit Ethernet MAC/PHY path
- USB 2/3 host
- PCIe or equivalent high-speed expansion
- I2C, SPI, UART, GPIO, PWM
- Linux support with long-term kernel/user-space maintainability

The initial prototype may use a Raspberry Pi Compute Module-class device or industrial equivalent. The carrier must avoid board-specific lock-in by placing vendor-specific pin mapping behind a hardware-abstraction definition.

## Hardware root of trust

Use a current-production secure element / TPM-class device with:

- hardware-protected private keys
- ECC signing / verification support
- SHA-256 support
- device-unique identity
- secure provisioning workflow
- I2C or SPI host interface
- secure-boot or measured-boot integration path

Do not freeze the design around ATECC608B: Microchip marks that family as not recommended for new designs. Prefer a current successor such as ATECC608C-family or another current-production secure element after sourcing review.

## Independent watchdog

Provide a hardware watchdog independent of the Linux SoC. It should:

- accept periodic heartbeat from the controller
- reset the compute module when heartbeat expires
- default to a conservative timeout during boot
- expose reset reason to software when possible
- never directly disable cooling on watchdog expiry

## Networking

Primary:
- 1x RJ45 Gigabit Ethernet with magnetics
- link/activity LEDs
- ESD protection

Optional/service:
- Wi-Fi/Bluetooth only for provisioning or noncritical deployments
- USB Ethernet fallback

Production mining operation should prefer wired Ethernet.

## Storage

- eMMC or industrial microSD for prototype
- NVMe preferred for telemetry-heavy deployments
- separate writable data partition from system image where practical
- A/B system partitions or equivalent rollback architecture for OTA

## Cooling I/O

Minimum 4 independent 4-wire fan channels:

- PWM output
- tachometer input
- fan-fail detection
- configurable fail-safe duty cycle
- local temperature-based emergency override

The fan controller should be able to force a safe high-speed state without relying exclusively on user-space software.

## Thermal sensing

Minimum sensors:

- controller PCB temperature
- compute-module temperature (software plus optional external sensor)
- inlet air temperature
- outlet air temperature
- optional PSU temperature
- optional hashboard-zone sensors

Use I2C-compatible digital sensors or equivalent industrial parts.

## Power telemetry

Monitor auxiliary controller power and expose expansion support for miner PSU measurements:

- input voltage
- current
- watts
- board rail status
- over/under-voltage event flags

Miner high-current power remains electrically separate from the low-voltage controller in revision A unless a certified power-control design is added.

## Hashboard / miner interfaces

The controller must support adapter daughterboards rather than hard-coding one vendor connector.

Required logical buses:

- UART
- SPI
- I2C
- GPIO reset/enable
- optional CAN/RS-485 for industrial expansion

Vendor daughterboards provide:

- connector mapping
- level shifting
- isolation where needed
- ESD/transient protection
- board-ID EEPROM

This supports NEO-native boards later while preserving Antminer/WhatsMiner interoperability today.

## Local service interfaces

- USB-C service/recovery port
- 3.3V UART debug header
- physical reset button
- recessed recovery/provisioning button
- status LEDs: power, system, network, miner, fault

## PCB targets

Prototype carrier:

- 4-layer minimum PCB
- controlled impedance where required
- separate noisy power/fan return paths from sensitive digital buses
- TVS/ESD protection on external connectors
- test pads for every power rail and major bus
- clear silkscreen IDs for connectors and test points

## Safety boundary

NEO Miner One v0.8 is a low-voltage controller reference. It must not directly switch mains voltage or multi-kilowatt ASIC power in the first hardware revision. PSU/mains control requires a separately engineered and certified subsystem with proper creepage, clearance, fusing, isolation, and regional electrical approvals.

## Manufacturing test

Every board should expose a fixture-driven test sequence for:

1. input rail current/leakage
2. 5V/3.3V rail validation
3. compute-module boot
4. Ethernet link + throughput
5. secure-element identity/signing
6. watchdog reset
7. storage read/write
8. fan PWM/tach channels
9. temperature sensors
10. UART/SPI/I2C/GPIO loopback
11. service USB
12. board serial + manufacturing certificate issuance

## Software binding

The controller boots into NEO Miner Controller v0.7 and registers a hardware identity. The software stack maps physical I/O through a hardware abstraction layer and exposes normalized device state to NEO Miner Agent.

```text
NEO Miner One Hardware
  -> Hardware Abstraction Layer
  -> NEO Miner Controller
  -> NEO Miner Agent
  -> Live Mining Gateway
  -> Dynamic Hashpower Aggregator
  -> Hashpower Contracts
  -> Verified BTC Attribution
  -> HashVault
```

## Status

This repository content is an engineering reference specification. It is not yet a finished schematic, PCB layout, certified power product, or proprietary ASIC design.
