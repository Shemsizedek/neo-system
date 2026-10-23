import unittest
from nchip007_device import measure,verify
class Tests(unittest.TestCase):
 def test_good(self): self.assertTrue(verify(measure("NEO-01","crystal","temperature_c",22,1)))
 def test_deterministic(self): self.assertEqual(measure("NEO-01","crystal","temperature_c",22,1),measure("NEO-01","crystal","temperature_c",22.0,1))
 def test_tamper(self):
  x=measure("NEO-01","crystal","temperature_c",22,1);x["payload"]["value"]=50;self.assertFalse(verify(x))
 def test_no_therapy(self):
  x=measure("NEO-01","neotherapy","temperature_c",22,1);x["payload"]["therapeutic_output_enabled"]=True;self.assertFalse(verify(x))
 def test_bad_family(self):
  with self.assertRaises(ValueError): measure("NEO-01","unknown","temperature_c",22,1)
 def test_bad_sequence(self):
  with self.assertRaises(ValueError): measure("NEO-01","crystal","temperature_c",22,0)
 def test_nonfinite(self):
  with self.assertRaises(ValueError): measure("NEO-01","crystal","temperature_c",float("nan"),1)
 def test_unknown_output(self):
  with self.assertRaises(ValueError): measure("NEO-01","crystal","rf_output",1,1)
if __name__=="__main__":unittest.main()
