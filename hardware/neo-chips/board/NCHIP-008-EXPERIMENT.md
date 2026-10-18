# NCHIP-008 controlled material experiment

Research question: Do quartz or resin/metal composite enclosures measurably change the electronics' temperature, vibration response or measured magnetic-field characteristics compared with a geometrically matched control enclosure?

## Conditions
A: unenclosed baseline fixture.
B: inert resin control enclosure (same shape).
C: quartz sample in isolated removable carrier.
D: resin/metal/quartz composite (often called orgonite) removable enclosure.

Use an unchanged instrument position, power profile and identical sensor configuration; randomize the order of B/C/D across repeated trials. Record ambient conditions, measurement instrument calibration traceability, timestamps and sensor placement. Include blank and sensor-offset measurements, and quantify uncertainty before claiming a difference. Any differences may reflect shielding, material thermal conductivity, geometry or instrumentation artifacts.

No claims of healing, emission of beneficial fields, medical treatment or effects on human subjects follow from this experiment. No human intervention in NCHIP-008.

## Minimum dataset contract
experiment_id, device_id, sample_id, condition, firmware_sha256, timestamp_utc, sample_counter, sensor_type, value, units, calibration_id, ambient_temperature_c, observer, notes. Store experiment provenance; no personal or health data.

## Acceptance
Validate schema, reject nonfinite readings, reject unknown condition/sensor/units, compare baseline-adjusted descriptive distributions and report repeatability. Publish raw measurements and an analysis notebook only after acquisition; do not invent observations.
