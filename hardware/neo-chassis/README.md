# NEO Miner Chassis & Mechanical Platform v0.11

Status: reference architecture
Parent: NEO MINER — ORIGIN
Target product: NEO Miner One / Pro

## Purpose

Define the mechanical platform that integrates the NEO controller, modular SHA-256 hashboards, low-voltage power-distribution interfaces, cooling, service access, and rack/standalone mounting.

This specification is a mechanical reference, not a certified enclosure drawing. Final dimensions, materials, fasteners, airflow values, acoustic ratings, ingress protection, structural loads, and compliance markings must be validated by qualified mechanical, thermal, electrical, safety, and manufacturing engineers before production.

## Mechanical design goals

- Modular three-hashboard baseline.
- Front-to-back serviceable airflow.
- Tool-light replacement of fans, hashboards, controller, filters, and low-voltage harnesses.
- Controller isolated from the highest-temperature airflow path where practical.
- No exposed mains wiring within the controller service zone.
- Fan replacement without removing hashboards.
- Cable routing that cannot contact fan blades or heatsinks.
- Rack-compatible and standalone deployment.
- Air-cooled baseline plus immersion-ready variant.
- Mechanical datum scheme suitable for automated fixture inspection.

## Baseline enclosure zones

1. Intake/filter zone
2. Fan intake zone
3. Hashboard/heatsink tunnel
4. Exhaust fan zone
5. Controller compartment
6. PSU/PDU interface bay
7. Service I/O panel
8. Cable-management channel

## Airflow architecture

Baseline flow is front-to-back.

INTAKE → FILTER → INLET FANS → HASHBOARD HEATSINK CHANNELS → EXHAUST FANS → HOT AISLE

Three hashboard air tunnels should remain mechanically separated enough to reduce recirculation and permit future per-board airflow measurement.

Rules:
- No major obstruction directly in front of fan hubs beyond required guards.
- Harnesses must not cross primary airflow paths unless retained against chassis surfaces.
- Intake and exhaust geometry must avoid immediate recirculation.
- Filter pressure drop must be included in thermal validation.
- Fan failure must not mechanically prevent adjacent fans from operating.

## Reference mechanical envelope

Revision A target class:
- Width: rack-friendly, compatible with standard 19-inch infrastructure through shelf/rail hardware.
- Height: 3U–4U class target depending on final fan diameter and heatsink height.
- Depth: 450–650 mm target range.
- Mass: target under 18 kg before external PSU infrastructure, subject to final thermal solution.

Exact dimensions are deliberately not frozen at this stage.

## Hashboard mounting

Each hashboard uses:
- keyed insertion rails,
- positive end-stop,
- retained electrical connector access,
- heatsink compression points isolated from PCB bending loads,
- captive fasteners or latch points where feasible,
- board removal path that does not require controller removal.

Hashboards should be individually replaceable.

## Heatsink mounting

Heatsink system requirements:
- controlled clamping load,
- flatness compatible with ASIC package requirements,
- serviceable thermal interface material,
- anti-rotation features,
- vibration-resistant fasteners,
- no load path that bows the PCB beyond supplier limits.

## Fan platform

Baseline:
- 4 high-static-pressure PWM fans minimum,
- front and rear fan bank capability,
- keyed connectors,
- fan guards,
- vibration isolation where compatible with airflow,
- tool-light replacement,
- tachometer feedback.

The mechanical design must support fail-safe full-speed operation commanded by local hardware/software safety controls.

## Filtration

Air-cooled variant supports a removable intake filter cassette.

Requirements:
- replaceable without removing hashboards,
- keyed orientation,
- filter-presence detection optional,
- pressure-drop monitoring future-ready,
- washable/pre-filter option for industrial deployments.

## Controller placement

The NEO Miner Controller should be mounted in a dedicated side or top compartment with:
- independent access panel,
- separation from direct heatsink exhaust,
- Ethernet and service ports accessible without opening the hashboard tunnel,
- recovery USB-C access,
- status LED visibility,
- secure-element identity label/QR area.

## PSU / PDU bay

The chassis provides a mechanical interface for the power platform but does not assume a specific mains PSU design.

The bay must support:
- isolated low-voltage DC bus entry,
- strain relief,
- protected busbar or high-current connector region,
- service disconnect interface,
- branch labeling for each hashboard,
- finger-safe barriers where required.

Any integrated AC-to-DC PSU version requires separate safety engineering and certification.

## Cable routing

Provide dedicated channels for:
- hashboard data,
- fan power/PWM/tach,
- temperature sensors,
- controller power,
- low-voltage DC branch cables,
- service/debug wiring.

High-current conductors and low-level sensor/data wiring should be separated where practical.

## Service access

Field-replaceable units (FRUs):
- intake filter,
- fans,
- controller module,
- hashboards,
- low-voltage harnesses,
- sensor harnesses,
- PSU/PDU module if product variant includes it.

Target service operations should avoid removing more than one unrelated module.

## Rack mounting

Support:
- standard 19-inch rack shelf or rail kit,
- front rack ears,
- rear support option,
- chassis handles sized for service use,
- grounding/bonding points,
- airflow compatible with hot-aisle/cold-aisle layouts.

Rack ears alone must not be treated as the sole support for a heavy chassis unless structurally validated.

## Standalone deployment

Optional:
- rubber isolation feet,
- stack-safe top/bottom geometry,
- minimum clearance markings,
- anti-tip guidance,
- cable bend-radius clearance.

## Acoustic strategy

The baseline miner is an industrial device and will not be marketed as silent.

Mechanical provisions should support:
- larger/lower-RPM fan variants,
- vibration-isolated fan mounts,
- tuned inlet/exhaust ducts,
- acoustic liner only where fire, dust, airflow, and thermal requirements allow,
- future residential/quiet enclosure as a separate SKU.

Acoustic targets must be verified through measured dBA testing at defined distance/load/ambient conditions.

## Dust and environment

Baseline indoor industrial design.

Targets:
- filtered intake,
- corrosion-resistant chassis finish,
- removable dust screens,
- conformal-coating option for controller electronics,
- no unsupported claim of IP rating until certified testing occurs.

## Immersion-ready variant

The immersion version removes air-specific fan/filter requirements and must use materials compatible with the selected dielectric fluid.

Requirements:
- removable fan assemblies or fan-delete plates,
- fluid-compatible seals, labels, cable insulation, and adhesives,
- vertical drain paths,
- lifting points,
- no trapped air cavities around critical components where avoidable,
- controller located outside immersion tank unless separately qualified,
- quick-disconnect low-voltage/data harness strategy.

## Heat-recovery interface

Air-cooled chassis should expose a defined exhaust duct interface suitable for optional heat capture.

Immersion systems should expose coolant supply/return interfaces at the tank/heat-exchanger level, not directly on the hashboard chassis.

## Grounding and bonding

Provide:
- chassis protective-earth bonding point,
- dedicated bonding studs for removable panels where required,
- conductive continuity across structural panels,
- corrosion-resistant grounding hardware.

Final protective-earth design belongs to electrical safety engineering.

## Mechanical identification

Each chassis should carry:
- chassis serial number,
- model/revision,
- manufacture date,
- controller identity reference,
- hashboard slot labels,
- service QR/reference code,
- electrical ratings once validated.

## Manufacturing requirements

Production fixtures should verify:
- critical dimensions,
- rail alignment,
- fan aperture alignment,
- controller mount location,
- PSU/PDU bay geometry,
- panel fit,
- fastener torque process,
- grounding continuity,
- airflow obstruction check,
- label placement.

## Change-control rule

Any mechanical change that affects airflow cross-section, fan impedance, heatsink pressure, board spacing, power-bus clearance, grounding, or service access requires thermal/electrical/mechanical re-review.

## Next integration boundary

v0.11 connects:

NEO Hashboard → Mechanical Rails / Heatsinks / Airflow → NEO Power & Thermal Platform → NEO Miner Controller → NEO Miner Agent → NEO Generator

The next program layer should turn this reference architecture into a prototype-ready mechanical package with CAD, thermal simulation inputs, drawings, tolerances, and EVT build requirements.
