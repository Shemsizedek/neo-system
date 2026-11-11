# NCHIP-008 — Universal NEO development board, revision A (proposal)

**State:** conceptual engineering specification; not fabricated, electrically tested, certified or medically validated.

## Architecture
USB-C 5V input -> commercially certified USB power module -> 3.3V current-limited logic rail -> microcontroller development module with USB serial, firmware debugger and watchdog. No mains input; no stimulators, field emitters or body-contact electrodes.

I2C addressable peripherals: digital temperature sensor, 3-axis magnetometer, 3-axis accelerometer. Board also exposes SPI header, UART debug, GPIO test points, and reset. Differential analogue input must use separately designed ADC and conditioned sensor module; do not assume microcontroller pins tolerate negative/higher voltage.

NEO device protocol: nchip.device.v1. Host parses raw data, calibrates from sensor datasheets, attaches firmware ID, board revision, sensor calibration and monotonic sample counter. NCHIP-007 simulator is NOT a calibrated physical sensor driver.

## Prototype connectors
P1 USB-C power/data (through approved dev module).
J1 I2C: 3V3/GND/SDA/SCL.
J2 SPI: 3V3/GND/SCK/MOSI/MISO/CS.
J3 UART: 3V3/GND/TX/RX.
J4 sense-only sensor-expansion module; zero active therapy outputs.
TP: GND, 3V3 and low-voltage logic test points.
Electrical ratings, pin assignments, connector orientation, pullups, ESD and bus capacitance require capture in KiCad before board ordering.

## Safety and acceptance
Prototype bench measurements only, with power/current limit, thermal evaluation, isolation/ESD checks, and physical enclosure inspection by a competent electronics engineer.
Therapeutic efficacy, patient safety, FDA classification and medical use are outside this gate.
Do not embed lithium batteries in poured resin; don't encapsulate overheating electronics. Keep antenna, sensor placement and thermal vents accessible.
Milestone for manufacturing: reviewed KiCad schematic/PCB, DRC/ERC, component availability, mechanical fit, BOM, assembly documents, independent review and bench test.
