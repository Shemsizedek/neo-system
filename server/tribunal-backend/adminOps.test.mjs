import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {TribunalService} from './service.mjs'
import {changePassword,consumePasswordReset,issuePasswordReset,operationalReport,recordDelivery} from './adminOps.mjs'

function db(){const d=new DatabaseSync(':memory:');d.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE password_resets(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
CREATE TABLE memberships(workspace_id TEXT NOT NULL REFERENCES workspaces(id),user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(workspace_id,user_id));
CREATE TABLE invitations(token_hash TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),email TEXT NOT NULL,role TEXT NOT NULL,expires_at TEXT NOT NULL,accepted_at TEXT,invited_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
CREATE TABLE cases(claim_no TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),envelope_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE efiles(filing_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,filed_by TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE notices(notice_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE hearings(hearing_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,starts_at TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE delivery_attempts(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),notice_id TEXT NOT NULL,adapter TEXT NOT NULL,destination TEXT NOT NULL,status TEXT NOT NULL,provider_ref TEXT,error TEXT,created_at TEXT NOT NULL);
CREATE TABLE audit_log(seq INTEGER PRIMARY KEY AUTOINCREMENT,workspace_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,action TEXT NOT NULL,subject TEXT NOT NULL,payload_hash TEXT NOT NULL,previous_hash TEXT,entry_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);`);return d}

test('v1.1 password recovery revokes sessions',()=>{process.env.NEO_TRIBUNAL_MASTER_KEY='test-key';const d=db(),service=new TribunalService(d);service.register({email:'chief@test.local',displayName:'Chief',password:'original-pass'});const login=service.login({email:'chief@test.local',password:'original-pass'}),chief=service.principal(login.token),ws=service.createWorkspace(chief,{name:'Tribunal'});const reset=issuePasswordReset(d,service,chief,ws.id,{email:'chief@test.local'});consumePasswordReset(d,{token:reset.token,newPassword:'replacement-pass'});assert.throws(()=>service.principal(login.token),/Authentication required/);assert.ok(service.login({email:'chief@test.local',password:'replacement-pass'}).token)})

test('v1.1 change password delivery record and report',()=>{const d=db(),service=new TribunalService(d);service.register({email:'owner@test.local',displayName:'Owner',password:'initial-pass'});const login=service.login({email:'owner@test.local',password:'initial-pass'}),owner=service.principal(login.token),ws=service.createWorkspace(owner,{name:'Ops'});recordDelivery(d,service,owner,ws.id,{noticeId:'N-1',adapter:'INTERNAL_RECORD',destination:'respondent@test.local'});const report=operationalReport(d,service,owner,ws.id);assert.equal(report.deliveries,1);assert.equal(report.audit.valid,true);const second=service.login({email:'owner@test.local',password:'initial-pass'}),principal=service.principal(second.token);changePassword(d,principal,{currentPassword:'initial-pass',newPassword:'changed-pass-1'});assert.throws(()=>service.principal(second.token),/Authentication required/)})
