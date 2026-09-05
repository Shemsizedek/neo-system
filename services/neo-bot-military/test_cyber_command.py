import os
import tempfile
import unittest
from pathlib import Path

_tmp = tempfile.TemporaryDirectory()
os.environ["NEO_BOT_DB"] = str(Path(_tmp.name) / "test.sqlite3")
os.environ["NEO_BOT_INTERNAL_TOKEN"] = "test-token"

import cyber_command as cc

class CyberCommandTests(unittest.TestCase):
    def setUp(self):
        if cc.DB_PATH.exists(): cc.DB_PATH.unlink()
        cc.connect().close()

    def test_snapshot_preserves_evidence(self):
        cc.add_snapshot({"platform":"instagram","account":"shemsizedek","observed_at":"2026-09-04T00:00:00Z","followers":2708,"source":"manual","evidence_refs":["screenshot:baseline"]})
        with cc.connect() as con:
            row=con.execute("SELECT * FROM account_snapshots").fetchone()
        self.assertEqual(row["followers"],2708)
        self.assertIn("screenshot:baseline",row["evidence_refs"])

    def test_incident_requires_evidence_class(self):
        with self.assertRaises(ValueError):
            cc.add_incident({"platform":"instagram","account":"shemsizedek","observed_at":"2026-09-04T00:00:00Z","type":"follower_loss","evidence_class":"proven_attack","statement":"claim"})

    def test_anomaly_does_not_assert_causation(self):
        for day,count in enumerate([2700,2702,2704,2600],1):
            cc.add_snapshot({"platform":"instagram","account":"shemsizedek","observed_at":f"2026-09-{day:02d}T00:00:00Z","followers":count,"source":"manual"})
        result=cc.anomalies("instagram","shemsizedek")
        self.assertEqual(result["causation"],"undetermined")
        self.assertTrue(result["flags"])

    def test_no_platform_write_routes(self):
        source=Path(cc.__file__).read_text()
        for forbidden in ("/follow", "/unfollow", "/like", "/comment", "/block", "/report"):
            self.assertNotIn(forbidden,source)

if __name__ == "__main__": unittest.main()
