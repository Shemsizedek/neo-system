import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryEnterpriseStore, createWorkspace, inviteMember, mapBusinessWallet,
  createBooksCompany, createMerchantLocation, organizationWorkspaceSnapshot
} from './workspaces.mjs';

const principalId='github:Shemsizedek';
const organizationId='neo-system';

function store(){ return new MemoryEnterpriseStore(); }

test('executive admin can build an organization operating workspace', async()=>{
  const s=store();
  const ws=await createWorkspace({store:s,principalId,organizationId,input:{name:'Executive Operations',class:'business',visibility:'private'}});
  assert.equal(ws.organization_id,organizationId);
  assert.equal(ws.visibility,'private');

  const member=await inviteMember({store:s,principalId,organizationId,input:{identity:'example:user',role:'member'}});
  assert.equal(member.status,'invited');

  const wallet=await mapBusinessWallet({store:s,principalId,organizationId,input:{label:'Treasury',address:'bc1qexample'}});
  assert.equal(wallet.platform,'neopay');

  const books=await createBooksCompany({store:s,principalId,organizationId,input:{name:'NEO System Books'}});
  assert.equal(books.platform,'neo-books');

  const merchant=await createMerchantLocation({store:s,principalId,organizationId,input:{name:'Main Merchant'}});
  assert.equal(merchant.terminal_platform,'neo-counter');

  const snapshot=await organizationWorkspaceSnapshot({store:s,principalId,organizationId});
  assert.equal(snapshot.workspaces.length,1);
  assert.equal(snapshot.members.length,1);
  assert.equal(snapshot.wallets.length,1);
  assert.equal(snapshot.books.length,1);
  assert.equal(snapshot.merchant_locations.length,1);
});

test('unknown principal cannot mutate enterprise workspace', async()=>{
  await assert.rejects(
    createWorkspace({store:store(),principalId:'unknown:user',organizationId,input:{name:'Denied'}}),
    /permission_denied/
  );
});
