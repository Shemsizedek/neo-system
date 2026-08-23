import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {TribunalService} from './service.mjs'

function db(){
  const d=new DatabaseSync(':memory:')
  d.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
  CREATE TABLE memberships(workspace_id TEXT NOT NULL REFERENCES workspaces(id),user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(workspace_id,user_id));
  CREATE TABLE invitations(token_hash TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),email TEXT NOT NULL,role TEXT NOT NULL,expires_at TEXT NOT NULL,accepted_at TEXT,invited_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
  CREATE TABLE cases(claim_no TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),envelope_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE audit_log(seq INTEGER PRIMARY KEY AUTOINCREMENT,workspace_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,action TEXT NOT NULL,subject TEXT NOT NULL,payload_hash TEXT NOT NULL,previous_hash TEXT,entry_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);`)
  return d
}

test('auth workspace invite encrypted case sync and audit chain',()=>{
  process.env.NEO_TRIBUNAL_MASTER_KEY='test-master-key'
  const service=new TribunalService(db())
  service.register({email:'chief@example.test',displayName:'Chief',password:'very-secure-1'})
  const chiefLogin=service.login({email:'chief@example.test',password:'very-secure-1'})
  const chief=service.principal(chiefLogin.token)
  const ws=service.createWorkspace(chief,{name:'Global District'})

  service.register({email:'clerk@example.test',displayName:'Clerk',password:'very-secure-2'})
  const clerkLogin=service.login({email:'clerk@example.test',password:'very-secure-2'})
  const clerk=service.principal(clerkLogin.token)
  const invite=service.invite(chief,ws.id,{email:'clerk@example.test',role:'CLERK'})
  service.acceptInvite(clerk,invite.token)

  const saved=service.saveCase(clerk,ws.id,{claimNo:'WT-1001',caseType:'CIVIL',statement:'Encrypted server record.'})
  assert.equal(saved.revision,1)
  const loaded=service.getCase(clerk,ws.id,'WT-1001')
  assert.equal(loaded.caseFile.statement,'Encrypted server record.')
  assert.throws(()=>service.saveCase(clerk,ws.id,{claimNo:'WT-1001',statement:'stale'},0),/Revision conflict/)
  const saved2=service.saveCase(clerk,ws.id,{claimNo:'WT-1001',statement:'revision two'},1)
  assert.equal(saved2.revision,2)
  assert.equal(service.verifyAudit(ws.id).valid,true)
  assert.ok(service.exportAudit(chief,ws.id).entries.length>=4)
})

test('server RBAC blocks viewer writes',()=>{
  const service=new TribunalService(db())
  service.register({email:'owner@example.test',displayName:'Owner',password:'very-secure-3'})
  const owner=service.principal(service.login({email:'owner@example.test',password:'very-secure-3'}).token)
  const ws=service.createWorkspace(owner,{name:'Court'})
  service.register({email:'view@example.test',displayName:'Viewer',password:'very-secure-4'})
  const viewer=service.principal(service.login({email:'view@example.test',password:'very-secure-4'}).token)
  const invite=service.invite(owner,ws.id,{email:'view@example.test',role:'VIEWER'})
  service.acceptInvite(viewer,invite.token)
  assert.throws(()=>service.saveCase(viewer,ws.id,{claimNo:'WT-2001'}),/Role CLERK/)
})
