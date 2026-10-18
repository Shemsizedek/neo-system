import json,unittest
from nchip009_capture import parse_line,parse_capture

def line(**kw):
 d={"protocol":"nchip.sensor.v1","device_id":"NCHIP-DEV-A","sequence":1,"sensor":"temperature_c","units":"C","value":23.25,"source":"tmp117"}
 d.update(kw)
 return json.dumps(d)
class CaptureTests(unittest.TestCase):
 def test_good(self): self.assertEqual(parse_line(line())["value"],23.25)
 def test_two_ordered(self): self.assertEqual(len(parse_capture([line(),line(sequence=2)])),2)
 def test_replay(self):
  with self.assertRaises(ValueError):parse_capture([line(),line()])
 def test_wrong_unit(self):
  with self.assertRaises(ValueError):parse_line(line(units="F"))
 def test_outlier(self):
  with self.assertRaises(ValueError):parse_line(line(value=500))
 def test_nan(self):
  with self.assertRaises(ValueError):parse_line(line(value=float("nan")))
 def test_status(self):
  with self.assertRaises(ValueError):parse_line(json.dumps({"protocol":"nchip.sensor.v1","error":"tmp117_unavailable"}))
 def test_bad_proto(self):
  with self.assertRaises(ValueError):parse_line(line(protocol="unknown"))
if __name__=="__main__":unittest.main()
