import test from 'node:test'
import assert from 'node:assert/strict'
import {hashOperatorPassword,verifyOperatorPassword,createOperatorAuth,PERMISSIONS} from './operatorAuth.mjs'

test('operator password hash verifies without storing plaintext',()=>{
  const hash=hashOperatorPassword('very-strong-operator-passphrase')
  assert.equal(verifyOperatorPassword('very-strong-operator-passphrase',hash),true)
  assert.equal(verifyOperatorPassword('wrong-password',hash),false)
  assert.equal(hash.includes('very-strong-operator-passphrase'),false)
})

test('session cookie is HttpOnly and treasury role enforces RBAC plus CSRF',()=>{
  const passwordHash=hashOperatorPassword('treasury-operator-passphrase')
  const auth=createOperatorAuth({secret:'x'.repeat(48),accounts:[{id:'alice',role:'TREASURY',displayName:'Alice',passwordHash}],ttlSeconds:900})
  const account=auth.authenticate('alice','treasury-operator-passphrase')
  assert.equal(account.id,'alice')
  const issued=auth.issue(account)
  assert.match(issued.cookie,/HttpOnly/)
  assert.match(issued.cookie,/Secure/)
  assert.match(issued.cookie,/SameSite=None/)
  const req={headers:{cookie:issued.cookie.split(';')[0],'x-csrf-token':issued.csrfToken}}
  const allowed=auth.requirePermission(req,PERMISSIONS.MANAGE_PAYOUTS,{csrf:true})
  assert.equal(allowed.ok,true)
  assert.equal(allowed.session.sub,'alice')
  const deniedCsrf=auth.requirePermission({headers:{cookie:issued.cookie.split(';')[0]}},PERMISSIONS.MANAGE_PAYOUTS,{csrf:true})
  assert.equal(deniedCsrf.error,'CSRF_VALIDATION_FAILED')
})

test('viewer cannot manage treasury',()=>{
  const passwordHash=hashOperatorPassword('viewer-operator-passphrase')
  const auth=createOperatorAuth({secret:'y'.repeat(48),accounts:[{id:'viewer',role:'VIEWER',passwordHash}],ttlSeconds:900})
  const issued=auth.issue(auth.authenticate('viewer','viewer-operator-passphrase'))
  const req={headers:{cookie:issued.cookie.split(';')[0],'x-csrf-token':issued.csrfToken}}
  assert.equal(auth.requirePermission(req,PERMISSIONS.VIEW_OPERATIONS).ok,true)
  assert.equal(auth.requirePermission(req,PERMISSIONS.MANAGE_TREASURY,{csrf:true}).status,403)
})
