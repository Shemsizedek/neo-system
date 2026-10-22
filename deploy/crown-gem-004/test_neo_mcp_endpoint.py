import io,json,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import bridge
class MockHandler:
 def __init__(self,payload,auth):
  self.path="/mcp";self.client_address=("127.0.0.1",1234)
  self.headers={"Authorization":auth,"Content-Length":str(len(payload))}
  self.rfile=io.BytesIO(payload);self.calls=[]
 def respond(self,status,data):self.calls.append((status,data))
 def send_response(self,status):self.calls.append((status,None))
 def send_header(self,*a):pass
 def end_headers(self):pass
class EndpointTests(unittest.TestCase):
 def test_missing_bearer_rejected(self):
  payload=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/list"}).encode()
  h=MockHandler(payload,"")
  with patch.object(bridge,"quota_allowed",return_value=True),patch.dict(bridge.os.environ,{"CROWN_BRIDGE_TOKEN":"k"*32}):
   bridge.Handler.do_POST(h)
  self.assertEqual(h.calls[0][0],401)
 def test_authorized_tools_are_read_only(self):
  payload=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/list"}).encode()
  h=MockHandler(payload,"Bearer "+"k"*32)
  with patch.object(bridge,"quota_allowed",return_value=True),patch.dict(bridge.os.environ,{"CROWN_BRIDGE_TOKEN":"k"*32}):
   bridge.Handler.do_POST(h)
  self.assertEqual(h.calls[0][0],200)
  names=[x["name"] for x in h.calls[0][1]["result"]["tools"]]
  self.assertEqual(names,["neo_status","neo_prepare_development"])
if __name__=="__main__":unittest.main()
