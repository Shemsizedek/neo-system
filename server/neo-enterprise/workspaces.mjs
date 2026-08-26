import { randomUUID } from 'node:crypto';
import { authorize } from './permissions.mjs';

export class MemoryEnterpriseStore {
  constructor(seed={organizations:[],workspaces:[],members:[],wallets:[],books:[],merchantLocations:[]}){
    this.state=structuredClone(seed);
  }
  list(type, organizationId){ return this.state[type].filter(x=>!organizationId||x.organization_id===organizationId); }
  add(type, value){ this.state[type].push(value); return value; }
  update(type, id, patch){ const i=this.state[type].findIndex(x=>x.id===id); if(i<0) return null; this.state[type][i]={...this.state[type][i],...patch}; return this.state[type][i]; }
}

async function requirePermission(principalId, organizationId, permission){
  const result=await authorize({principalId,organizationId,permission});
  if(!result.allowed){ const e=new Error(result.reason||'permission_denied'); e.statusCode=403; throw e; }
  return result;
}

function id(prefix){ return `${prefix}_${randomUUID()}`; }
function visibility(v){ if(!['public','private'].includes(v)) throw new Error('invalid_visibility'); return v; }
function profileType(v){ if(!['organization','company','institution','sole_proprietor'].includes(v)) throw new Error('invalid_profile_type'); return v; }

export async function createOrganization({store,principalId,input}){
  await requirePermission(principalId,null,'organization:create');
  const now=new Date().toISOString();
  return store.add('organizations',{
    id: input.id||id('org'),
    name: String(input.name||'').trim(),
    profile_type: profileType(input.profile_type||'company'),
    visibility: visibility(input.visibility||'private'),
    status:'active',
    created_at:now,
    created_by:principalId
  });
}

export async function createWorkspace({store,principalId,organizationId,input}){
  await requirePermission(principalId,organizationId,'workspace:create');
  return store.add('workspaces',{
    id:id('ws'), organization_id:organizationId,
    name:String(input.name||'Primary Workspace').trim(),
    class:input.class||'business', visibility:visibility(input.visibility||'private'),
    status:'active', created_at:new Date().toISOString()
  });
}

export async function setWorkspaceVisibility({store,principalId,organizationId,workspaceId,visibility:next}){
  await requirePermission(principalId,organizationId,'workspace:update');
  const current=store.list('workspaces',organizationId).find(x=>x.id===workspaceId);
  if(!current){ const e=new Error('workspace_not_found'); e.statusCode=404; throw e; }
  return store.update('workspaces',workspaceId,{visibility:visibility(next),updated_at:new Date().toISOString()});
}

export async function inviteMember({store,principalId,organizationId,input}){
  await requirePermission(principalId,organizationId,'team:invite');
  return store.add('members',{
    id:id('member'), organization_id:organizationId,
    identity:String(input.identity||'').trim(), role:input.role||'member',
    status:'invited', invited_at:new Date().toISOString(), invited_by:principalId
  });
}

export async function assignRole({store,principalId,organizationId,memberId,role}){
  await requirePermission(principalId,organizationId,'team:assign_role');
  const member=store.list('members',organizationId).find(x=>x.id===memberId);
  if(!member){ const e=new Error('member_not_found'); e.statusCode=404; throw e; }
  return store.update('members',memberId,{role,updated_at:new Date().toISOString()});
}

export async function mapBusinessWallet({store,principalId,organizationId,input}){
  await requirePermission(principalId,organizationId,'wallet:assign');
  return store.add('wallets',{
    id:id('walletmap'), organization_id:organizationId,
    label:String(input.label||'Business Wallet').trim(),
    address:String(input.address||'').trim(), network:input.network||'bitcoin',
    platform:input.platform||'neopay', status:'active', created_at:new Date().toISOString()
  });
}

export async function createBooksCompany({store,principalId,organizationId,input}){
  await requirePermission(principalId,organizationId,'books:create');
  return store.add('books',{
    id:id('books'), organization_id:organizationId,
    name:String(input.name||'Company Books').trim(), platform:'neo-books',
    fiscal_year_start:input.fiscal_year_start||'01-01', status:'active', created_at:new Date().toISOString()
  });
}

export async function createMerchantLocation({store,principalId,organizationId,input}){
  await requirePermission(principalId,organizationId,'merchant:create');
  return store.add('merchantLocations',{
    id:id('merchant'), organization_id:organizationId,
    name:String(input.name||'Primary Location').trim(), terminal_platform:'neo-counter',
    status:'active', created_at:new Date().toISOString()
  });
}

export async function organizationWorkspaceSnapshot({store,principalId,organizationId}){
  await requirePermission(principalId,organizationId,'organization:read');
  return {
    organization_id:organizationId,
    workspaces:store.list('workspaces',organizationId),
    members:store.list('members',organizationId),
    wallets:store.list('wallets',organizationId),
    books:store.list('books',organizationId),
    merchant_locations:store.list('merchantLocations',organizationId)
  };
}
