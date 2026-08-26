import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');

async function readJson(relative){return JSON.parse(await fs.readFile(path.join(root,relative),'utf8'))}

export async function loadEnterpriseRegistry(){
  const [roles,organizations,memberships]=await Promise.all([
    readJson('registry/enterprise/roles.json'),
    readJson('registry/enterprise/organizations.json'),
    readJson('registry/enterprise/memberships.json')
  ]);
  return {roles:roles.roles,organizations:organizations.organizations,memberships:memberships.memberships};
}

function permissionMatches(granted,requested){
  if(granted==='enterprise:*') return true;
  if(granted===requested) return true;
  if(granted.endsWith(':*')) return requested.startsWith(granted.slice(0,-1));
  return false;
}

export async function authorize({principalId,organizationId,permission}){
  if(!principalId||!permission) return {allowed:false,reason:'missing_context'};
  const registry=await loadEnterpriseRegistry();
  const memberships=registry.memberships.filter(m=>m.principal_id===principalId&&m.status==='active');
  for(const membership of memberships){
    const role=registry.roles[membership.role];
    if(!role) continue;
    const inScope=membership.scope==='system'||!organizationId||membership.organization_ids?.includes(organizationId);
    if(inScope&&role.permissions.some(p=>permissionMatches(p,permission))){
      return {allowed:true,role:membership.role,scope:membership.scope};
    }
  }
  return {allowed:false,reason:'permission_denied'};
}

export async function publicOrganizations(){
  const {organizations}=await loadEnterpriseRegistry();
  return organizations.filter(o=>o.visibility==='public').map(({id,name,profile_type,status,workspace_classes,services,public_profile})=>({id,name,profile_type,status,workspace_classes,services,public_profile}));
}
