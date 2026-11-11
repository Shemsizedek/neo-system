# NCHIP-009 Rev A — engineering pinout and provisional BOM

**Status:** bench wiring specification, NOT an ERC/DRC-verified KiCad schematic, PCB, certified device or assembled product.

Use an ESP32-S3 DevKitC-1 development module as an *evaluation platform*, not a fabricated NEO chip. Power from a current-limited 5V USB supply. Verify the board's actual 3.3V pin regulator current capacity before wiring peripherals. All GPIO are 3.3V logic; never apply 5V to GPIO.

| Function | Candidate | Supply | ESP32-S3 pin (provisional) | I2C address |
| --- | --- | --- | --- | --- |
| Controller | ESP32-S3 DevKitC-1 | USB 5V | module | n/a |
| Temperature | TMP117 breakout | 3V3 | SDA GPIO8, SCL GPIO9 | 0x48 (verify ADD0) |
| Magnetic field | LIS3MDL breakout | 3V3 | shared SDA/SCL | 0x1E (verify SA1) |
| Acceleration | LIS3DH breakout | 3V3 | shared SDA/SCL | 0x18 (verify SA0) |
| Power and ground | current-limited USB, common GND | — | 3V3/GND | — |
| Test fixture | removable resin/quartz sample holder, nonconductive spacer | passive | none | — |

Provisional materials: one of each above breakout, one ESP32-S3 evaluation board, 3.3V-compatible jumper harness, insulated standoffs, optional logic analyzer and bench supply with current limitation. Source actual part numbers, supplier quotes, pull-up configuration, I2C voltage tolerance and pin-mux conflicts before ordering. Never connect multiple enabled pull-ups without verifying bus effective resistance.

## Mandatory KiCad release gate
Capture schematic, exact library footprints and manufacturer part numbers, connector/pin mapping, decoupling, ESD, rail budget, watchdog and debug header. Run ERC, layout PCB, run DRC and independent electrical review. The schematic and board layout **are not yet present** and this gate does not authorize fabrication.

## Research safeguards
USB-powered, sensor-only measurements. No power amplifier, coil driver, treatment applicator, stimulation electrode, human-subject experiment, therapeutic emission or medical efficacy claim. Magnetic-field readings may be distorted by nearby ferrous metals and powered equipment. Encapsulation must be removable and must not trap unsafe heat.
