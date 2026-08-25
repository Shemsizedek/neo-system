CREATE TABLE IF NOT EXISTS cases (
  case_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_no TEXT UNIQUE NOT NULL,
  caption TEXT NOT NULL,
  case_class TEXT,
  jurisdiction_class TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  summary TEXT
);
CREATE TABLE IF NOT EXISTS parties (party_id INTEGER PRIMARY KEY AUTOINCREMENT,case_no TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,capacity TEXT,contact_ref TEXT);
CREATE TABLE IF NOT EXISTS docket (docket_id INTEGER PRIMARY KEY AUTOINCREMENT,docket_no TEXT UNIQUE NOT NULL,case_no TEXT NOT NULL,seq INTEGER NOT NULL,filed_at TEXT NOT NULL,filer TEXT,filing_type TEXT NOT NULL,title TEXT NOT NULL,description TEXT,access_level TEXT NOT NULL DEFAULT 'PUBLIC',file_path TEXT,sha256 TEXT,supersedes_docket_no TEXT,is_original INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY,case_no TEXT NOT NULL,title TEXT NOT NULL,evidence_class TEXT NOT NULL,source_type TEXT,source_ref TEXT,date_of_record TEXT,access_level TEXT NOT NULL DEFAULT 'PUBLIC',authentication_status TEXT NOT NULL DEFAULT 'UNRESOLVED',provenance_score INTEGER DEFAULT 0,issuer_verification_score INTEGER DEFAULT 0,chain_of_custody_score INTEGER DEFAULT 0,internal_consistency_score INTEGER DEFAULT 0,external_corroboration_score INTEGER DEFAULT 0,legal_traceability_score INTEGER DEFAULT 0,total_auth_score INTEGER DEFAULT 0,notes TEXT);
CREATE TABLE IF NOT EXISTS claims (claim_id TEXT PRIMARY KEY,case_no TEXT NOT NULL,proposition TEXT NOT NULL,claimant TEXT,claim_type TEXT,source_evidence_id TEXT,status TEXT NOT NULL DEFAULT 'UNRESOLVED',legal_effect TEXT,notes TEXT);
CREATE TABLE IF NOT EXISTS contradictions (contradiction_id INTEGER PRIMARY KEY AUTOINCREMENT,case_no TEXT NOT NULL,claim_id TEXT,adverse_source_ref TEXT,description TEXT NOT NULL,severity TEXT DEFAULT 'MEDIUM',status TEXT DEFAULT 'OPEN');
CREATE TABLE IF NOT EXISTS title_chain (title_node_id INTEGER PRIMARY KEY AUTOINCREMENT,case_no TEXT NOT NULL,seq INTEGER NOT NULL,node_type TEXT NOT NULL,instrument_name TEXT NOT NULL,grantor TEXT,grantee TEXT,property_description TEXT,instrument_date TEXT,source_evidence_id TEXT,authentication_status TEXT DEFAULT 'UNRESOLVED',notes TEXT);
CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY,case_no TEXT NOT NULL,issued_at TEXT NOT NULL,order_type TEXT NOT NULL,title TEXT NOT NULL,jurisdiction_class TEXT,operative_text TEXT NOT NULL,access_level TEXT NOT NULL DEFAULT 'PUBLIC',status TEXT NOT NULL DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS professional_accountability (record_id INTEGER PRIMARY KEY AUTOINCREMENT,case_no TEXT NOT NULL,person_or_entity TEXT NOT NULL,role TEXT,duty_or_authority TEXT,alleged_act_or_omission TEXT,supporting_evidence_ref TEXT,adverse_evidence_ref TEXT,status TEXT DEFAULT 'INVESTIGATIVE_LEAD',notes TEXT);
CREATE TABLE IF NOT EXISTS audit_log (audit_id INTEGER PRIMARY KEY AUTOINCREMENT,occurred_at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,object_type TEXT NOT NULL,object_id TEXT NOT NULL,before_hash TEXT,after_hash TEXT,notes TEXT);
INSERT INTO cases(case_no,caption,case_class,jurisdiction_class,status,opened_at,summary) VALUES
('NEO-2026-GLOBAL-0001','TVM-LSM-666 v. NEO-LPS-999','Global-Affect / Title / Financial / Ecclesiastical','J3','ACTIVE FORENSIC INVESTIGATION','2026-08-25T00:00:00Z','Title, succession, custody, fiduciary, financial, ecclesiastical, and institutional-authority investigation.'),
('NEO-2026-POSTCONV-0002','United States v. Dwight D. York / Malachi Z. York','Post-Conviction / Ecclesiastical / Civil-Rights / Professional Accountability','J3','PRELIMINARY FORENSIC INTAKE','2026-08-25T00:00:00Z','Post-conviction innocence, due-process, witness, property, retaliation, and professional-accountability review.');
INSERT INTO title_chain(case_no,seq,node_type,instrument_name,property_description,instrument_date,authentication_status,notes) VALUES
('NEO-2026-GLOBAL-0001',1,'ROOT TITLE','OCT T-01-4','Asserted root title / Hacienda Filipina Archipelago',NULL,'UNRESOLVED','Priority root-title authentication'),
('NEO-2026-GLOBAL-0001',2,'ENTITLEMENT','1949 Proclamation / Certificate of Entitlement','Asserted entitlement to assets/gold','1949','UNRESOLVED','Issuer and archive verification required'),
('NEO-2026-GLOBAL-0001',3,'SUCCESSION','1952 Last Will and Testament','Succession / heirship','1952','UNRESOLVED','Original, witnesses, probate/recognition required'),
('NEO-2026-GLOBAL-0001',4,'SUCCESSION','1962 Last Will and Testament','Further succession / bank-asset claim','1962','UNRESOLVED','Original, witnesses, probate/recognition required'),
('NEO-2026-GLOBAL-0001',5,'JUDICIAL','1972 Judgment / Compromise Agreement','Judicial recognition claim','1972-02-04','UNRESOLVED','Certified court copy required'),
('NEO-2026-GLOBAL-0001',6,'JUDICIAL','1974 Clarification Order','Interpretation / confirmation','1974-03-21','UNRESOLVED','Certified court copy required'),
('NEO-2026-GLOBAL-0001',7,'JUDICIAL','1976 Supreme Court Order','Claimed high-level adjudication','1976','UNRESOLVED','Official Supreme Court archive confirmation required'),
('NEO-2026-GLOBAL-0001',8,'AGREEMENT','Bilateral Minesfield Breakthrough Successor Agreement (BMBSA)','Alleged gold-reserve / trust agreement','1950','UNRESOLVED','Counterpart signatures, authority, and ledger trail required'),
('NEO-2026-GLOBAL-0001',9,'CUSTODY','CBP Delivery Receipts / Gold Certificates','Physical custody / deposit','1949-1950','UNRESOLVED','BSP predecessor records, assays, ledgers required'),
('NEO-2026-GLOBAL-0001',10,'SUCCESSOR LIABILITY','CBP → BSP / RA 7653 Section 132','Institutional succession / alleged liability',NULL,'UNRESOLVED','Specific liability must be matched to statutory transfer records');
INSERT INTO evidence(evidence_id,case_no,title,evidence_class,source_type,source_ref,access_level,authentication_status,total_auth_score,notes) VALUES
('NEO-2026-GLOBAL-0001-EX-0001','NEO-2026-GLOBAL-0001','TVM Affidavit','T1','Affidavit','TVM Affidavit PDF','RESTRICTED','UNRESOLVED',50,'Primary case affidavit; internal architecture reviewed.'),
('NEO-2026-GLOBAL-0001-EX-0002','NEO-2026-GLOBAL-0001','World Treasury chronology','C2','Website','worldtreasurydot.wordpress.com','PUBLIC','PROVISIONALLY_CORROBORATED',35,'Same-ecosystem chronology; dates/instrument names useful, issuer authentication outstanding.'),
('NEO-2026-GLOBAL-0001-EX-0003','NEO-2026-GLOBAL-0001','King Solomon Trust succession claims','C2','Website','kingsolomontrust.com','PUBLIC','PROVISIONALLY_CORROBORATED',35,'Later successor-claim ecosystem.'),
('NEO-2026-GLOBAL-0001-EX-0004','NEO-2026-GLOBAL-0001','2018 purported nullification of TVM immunity','C2','Website','worldmarshalseworldgov.wordpress.com','PUBLIC','CONTESTED',32,'Adverse same-ecosystem instrument; authority/jurisdiction unresolved.');
