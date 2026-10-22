import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_ai_router import normalize,route
class RouterTests(unittest.TestCase):
 def test_multiple_providers(self):
  for p in ("gemini","openai","neo-oracle"):
   self.assertEqual(normalize("hello",p)["provider"],p)
 def test_source_is_not_authentication(self):
  self.assertFalse(normalize("hello","gemini","My Gem")["authenticated"])
 def test_denies_unauthorized(self):
  with self.assertRaises(PermissionError):route("bitcoin.tx.read",False,["bitcoin.tx.read"])
 def test_denies_unknown_operation(self):
  with self.assertRaises(ValueError):route("wallet.sign",True,["wallet.sign"])
 def test_cannot_execute_even_if_allowed(self):
  self.assertFalse(route("counterparty.asset.read",True,["counterparty.asset.read"])["execution_authorized"])
if __name__=="__main__":unittest.main()
