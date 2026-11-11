"""NCHIP-009 strict receiver for newline-delimited JSON sensor capture; no serial/device actions."""
import json, math
PROTO = "nchip.sensor.v1"
RANGES = {"temperature_c": ("C", -40, 125)}
def parse_line(line):
    if not isinstance(line, str) or len(line) > 2048: raise ValueError("invalid frame size")
    data = json.loads(line)
    if not isinstance(data, dict) or data.get("protocol") != PROTO: raise ValueError("unknown protocol")
    if "error" in data: raise ValueError("device error: "+str(data["error"]))
    if not isinstance(data.get("device_id"),str) or not data["device_id"]: raise ValueError("device missing")
    if type(data.get("sequence")) is not int or data["sequence"] < 1: raise ValueError("invalid sequence")
    sensor=data.get("sensor")
    if sensor not in RANGES: raise ValueError("unknown sensor")
    units, low, high = RANGES[sensor]
    if data.get("units") != units: raise ValueError("unit mismatch")
    value=data.get("value")
    if type(value) not in (int,float) or not math.isfinite(value) or not low<=value<=high:
        raise ValueError("invalid measurement")
    return data

def parse_capture(lines):
    out=[]; last={}
    for line in lines:
        record=parse_line(line)
        device=record["device_id"]
        if record["sequence"] <= last.get(device,0): raise ValueError("duplicate/out-of-order capture")
        last[device]=record["sequence"]
        out.append(record)
    return out
