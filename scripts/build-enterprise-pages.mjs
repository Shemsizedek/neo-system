import fs from 'node:fs/promises';
import path from 'node:path';
import {publicOrganizations} from '../server/neo-enterprise/permissions.mjs';

const root=process.cwd();
const out=path.join(root,'dist','api','enterprise');
await fs.mkdir(out,{recursive:true});
const organizations=await publicOrganizations();
const roles=JSON.parse(await fs.readFile(path.join(root,'registry','enterprise','roles.json'),'utf8'));
const generatedAt=new Date().toISOString();
await fs.writeFile(path.join(out,'organizations.json'),JSON.stringify({version:1,generated_at:generatedAt,organizations},null,2)+'\n');
await fs.writeFile(path.join(out,'roles.json'),JSON.stringify({version:roles.version,generated_at:generatedAt,roles:roles.roles},null,2)+'\n');
await fs.writeFile(path.join(out,'index.json'),JSON.stringify({version:1,generated_at:generatedAt,organizations:'/neo-system/api/enterprise/organizations.json',roles:'/neo-system/api/enterprise/roles.json'},null,2)+'\n');
console.log(`Published ${organizations.length} public enterprise organizations`);
