"""NCHIP-007 universal measurement protocol (simulation only)."""
import hashlib,json,math
FAMILIES={"core","nous","neotherapy","crystal","energy"}
SENSORS={"temperature_c":(-40,125),"magnetic_field_ut":(-2000,2000),"acceleration_g":(-16,16)}
def measure(device_id,family,sensor,value,sequence):
    if not isinstance(device_id,str) or not device_id or family not in FAMILIES: raise ValueError("device identity")
    if sensor not in SENSORS or type(value) not in (int,float) or not math.isfinite(value): raise ValueError("sensor")
    low,high=SENSORS[sensor]
    if not low<=value<=high or type(sequence) is not int or sequence<=0: raise ValueError("range or sequence")
    payload={"protocol":"nchip.device.v1","device_id":device_id,"family":family,"sensor":sensor,"value":float(value),"sequence":sequence,"simulation":True,"therapeutic_output_enabled":False}
    sha=hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
    return {"payload":payload,"sha256":sha}
def verify(record):
    try:
        p=record["payload"]
        return record==measure(p["device_id"],p["family"],p["sensor"],p["value"],p["sequence"])
    except (ValueError,KeyError,TypeError): return False
