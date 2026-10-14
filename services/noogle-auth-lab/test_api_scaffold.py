import io,json,unittest
from api_scaffold import application

def request(method,path):
    results={}
    def start(status,headers):
        results["status"]=status
        results["headers"]=dict(headers)
    body=b"".join(application({"REQUEST_METHOD":method,"PATH_INFO":path},start))
    return results["status"],json.loads(body),results["headers"]

class TestGuardianAPI(unittest.TestCase):
    def test_health_is_not_authenticated(self):
        status,data,headers=request("GET","/api/guardian/health")
        self.assertEqual(status,"200 OK")
        self.assertEqual(data["mode"],"preproduction")
        self.assertEqual(headers["Cache-Control"],"no-store")
    def test_capabilities_explicit(self):
        status,data,_=request("GET","/api/guardian/capabilities")
        self.assertEqual(data["remote_terminal"],"disabled")
        self.assertEqual(data["webauthn"],"not_enabled")
    def test_registration_rejected(self):
        status,_,_=request("POST","/api/guardian/passkeys/registration/options")
        self.assertEqual(status,"403 Forbidden")
    def test_terminal_rejected(self):
        status,_,_=request("POST","/api/guardian/terminal/requests")
        self.assertEqual(status,"403 Forbidden")
    def test_devices_rejected(self):
        status,_,_=request("GET","/api/guardian/devices")
        self.assertEqual(status,"403 Forbidden")
    def test_unknown(self):
        status,_,_=request("GET","/garbage")
        self.assertEqual(status,"404 Not Found")
if __name__=="__main__":unittest.main()
