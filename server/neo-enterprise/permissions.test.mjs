import test from 'node:test';
import assert from 'node:assert/strict';
import {authorize,publicOrganizations} from './permissions.mjs';

test('executive admin has system-wide enterprise permission',async()=>{
  const result=await authorize({principalId:'github:Shemsizedek',organizationId:'neo-system',permission:'wallet:compose'});
  assert.equal(result.allowed,true);
  assert.equal(result.role,'executive_admin');
});

test('unknown principal is denied',async()=>{
  const result=await authorize({principalId:'github:unknown',organizationId:'neo-system',permission:'books:read'});
  assert.equal(result.allowed,false);
});

test('public organization projection contains no memberships',async()=>{
  const organizations=await publicOrganizations();
  assert.ok(organizations.some(o=>o.id==='neo-system'));
  assert.ok(organizations.some(o=>o.id==='gisd'));
  assert.equal(JSON.stringify(organizations).includes('github:Shemsizedek'),false);
});
