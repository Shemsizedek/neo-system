import unittest
from gateway import create_app, GatewayConfigurationError

class Service:
    def overview(self,*,identity,site_id,tariff):
        if identity!="verified" or site_id!="site1":
            raise PermissionError()
        return {"site_id":site_id,"status":"SIMULATION_ONLY","billable":False}

class GatewayTests(unittest.TestCase):
    def request(self,app,path,method="GET"):
        response={}
        def start(status,headers): response.update(status=status,headers=headers)
        payload=b"".join(app({"REQUEST_METHOD":method,"PATH_INFO":path},start))
        return response["status"],payload
    def test_no_auth_provider_fails_closed(self):
        with self.assertRaises(GatewayConfigurationError):
            create_app(customer_service=Service())
    def test_authorized_view(self):
        app=create_app(customer_service=Service(),verified_session_provider=lambda env:
                       {"principal":"verified","tariff":{}})
        status,data=self.request(app,"/v1/energy/customer/sites/site1/overview")
        self.assertEqual(status,"200 OK")
        self.assertIn(b"SIMULATION_ONLY",data)
    def test_cross_site_rejected(self):
        app=create_app(customer_service=Service(),verified_session_provider=lambda env:
                       {"principal":"verified","tariff":{}})
        status,_=self.request(app,"/v1/energy/customer/sites/site2/overview")
        self.assertEqual(status,"403 Forbidden")
    def test_missing_session_rejected(self):
        app=create_app(customer_service=Service(),verified_session_provider=lambda env:None)
        status,_=self.request(app,"/v1/energy/customer/sites/site1/overview")
        self.assertEqual(status,"401 Unauthorized")
    def test_write_rejected(self):
        app=create_app(customer_service=Service(),verified_session_provider=lambda env:None)
        status,_=self.request(app,"/v1/energy/customer/sites/site1/overview","POST")
        self.assertEqual(status,"405 Method Not Allowed")
if __name__=="__main__":unittest.main()
