import unittest
from experiment_schema import Measurement

class SchemaTests(unittest.TestCase):
    def base(self, **kwargs):
        defaults=dict(experiment_id="EX-001",device_id="NEO-01",condition="A_baseline",sensor_type="temperature_c",value=22.0,units="C",sample_counter=1,calibration_id="CAL-001")
        defaults.update(kwargs)
        return Measurement(**defaults)
    def test_valid(self): self.assertTrue(self.base().validate())
    def test_unknown_condition(self):
        with self.assertRaises(ValueError): self.base(condition="E").validate()
    def test_bad_units(self):
        with self.assertRaises(ValueError): self.base(units="Hz").validate()
    def test_nan(self):
        with self.assertRaises(ValueError): self.base(value=float("nan")).validate()
    def test_counter(self):
        with self.assertRaises(ValueError): self.base(sample_counter=-1).validate()
    def test_identity(self):
        with self.assertRaises(ValueError): self.base(device_id="").validate()
if __name__=="__main__": unittest.main()
