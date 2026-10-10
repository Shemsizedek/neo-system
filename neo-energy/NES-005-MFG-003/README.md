# NES-005-MFG-003 — First Article Manufacturing Data

Status: preliminary manufacturing data and validation specification. No approved fabrication schematics, Gerbers, or released CAD.

## Pilot
- THERMO-01: two units; $110 material target each.
- RESONANCE-01: two units; $140 material target each.
- HARVEST-01: two units; $165 material target each.
- Planned base materials $830; 20% contingency $166; **total ceiling $996**.
- Price values are budget estimates, not verified supplier quotes; freight, taxes, instruments, engineering and certification are excluded.

## Component lock and purchasing prerequisites
Record each manufacturer part number, authorized supplier, datasheet revision, operating ratings, quoted delivered cost, quantity, lead time, substitutes and quote timestamp. Prior to purchase lock protection, storage chemistry, thermal interface and circuit compatibility. Stage one unit per design for first-article inspection before duplicating.

## Fabrication deliverables
1. FreeCAD native enclosure and fixtures, dimensioned drawings and STEP/STL exports.
2. KiCad schematic project with ERC, PCB layout with DRC, BOM, netlist and fabrication outputs where a custom PCB is needed.
3. Firmware source and reproducible build instructions for HARVEST-01.
4. Test fixtures and logs with calibrated input/output power, temperatures, uncertainty and repeatability.
5. First-article discrepancy reports and controlled revision release.

## Safety
Laboratory-only, low-voltage current-limited designs. No mains exposure, unqualified grid interconnection, unprotected energy storage, open flames or high-voltage resonant coil apparatus. Manufacturer temperature/voltage/current ratings govern. Human engineering approval needed before fabrication release.

## Release criteria
Documented supplier qualification, approved schematics and mechanical drawings, reviewed thermal/electrical protections, inspected assembly, repeated measured function and reviewable test evidence. No device may be designated field-qualified automatically.
