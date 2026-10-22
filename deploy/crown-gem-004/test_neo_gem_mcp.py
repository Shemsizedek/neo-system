import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_gem_mcp import respond
def call(method,params=None):
 return respond({"jsonrpc":"2.0","id":1,"method":method,"params":params or {}})
class MCPTests(unittest.TestCase):
 def test_initialize(self):
  self.assertEqual(call("initialize")["result"]["serverInfo"]["name"],"neo-gem-private")
 def test_tools_are_review_only(self):
  names=[x["name"] for x in call("tools/list")["result"]["tools"]]
  self.assertEqual(names,["neo_status","neo_prepare_development"])
 def test_prepares_without_writing(self):
  r=call("tools/call",{"name":"neo_prepare_development","arguments":{"request":"Build an editor"}})
  self.assertIn("awaiting_owner_review",r["result"]["content"][0]["text"])
  self.assertIn('"github_writes": false',r["result"]["content"][0]["text"])
 def test_rejects_unknown_tool(self):
  self.assertEqual(call("tools/call",{"name":"deploy","arguments":{}})["error"]["code"],-32602)
 def test_rejects_oversized_request(self):
  self.assertEqual(call("tools/call",{"name":"neo_prepare_development","arguments":{"request":"x"*2001}})["error"]["code"],-32602)
 def test_rejects_arbitrary_methods(self):
  self.assertEqual(call("resources/read")["error"]["code"],-32601)
if __name__=="__main__":unittest.main()
