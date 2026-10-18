"""NCHIP-008 material experiment schema validation. No hardware connection."""
from dataclasses import dataclass
import math
CONDITIONS = {"A_baseline","B_resin_control","C_quartz","D_composite"}
UNITS = {"temperature_c":"C","magnetic_field_ut":"uT","acceleration_g":"g"}

@dataclass(frozen=True)
class Measurement:
    experiment_id: str
    device_id: str
    condition: str
    sensor_type: str
    value: float
    units: str
    sample_counter: int
    calibration_id: str

    def validate(self):
        for name in ("experiment_id","device_id","calibration_id"):
            if not isinstance(getattr(self,name),str) or not getattr(self,name):
                raise ValueError(name+" required")
        if self.condition not in CONDITIONS:
            raise ValueError("invalid experiment condition")
        if self.sensor_type not in UNITS or self.units != UNITS[self.sensor_type]:
            raise ValueError("sensor/unit mismatch")
        if type(self.value) not in (int,float) or not math.isfinite(self.value):
            raise ValueError("non-finite/invalid reading")
        if type(self.sample_counter) is not int or self.sample_counter < 0:
            raise ValueError("invalid sample counter")
        return True
