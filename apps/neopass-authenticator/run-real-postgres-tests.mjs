// Manual Gate 5 invocation only. Refuse to call a destructive test against any
// networked or unverified database. No database or service is created here.
import {spawnSync} from 'node:child_process';
const value=process.env.NEOPASS_DISPOSABLE_PG_URL;
let safe=false;
try {
  const u=new URL(value);
  safe=['postgres:','postgresql:'].includes(u.protocol) &&
    ['localhost','127.0.0.1','[::1]'].includes(u.hostname) &&
    /(?:test|ci|disposable)/i.test(u.pathname) &&
    !u.searchParams.has('host');
} catch {}
if (!safe) {
  console.error('NO-GO: set NEOPASS_DISPOSABLE_PG_URL to a dedicated local disposable PostgreSQL test database; no tests executed.');
  process.exit(2);
}
const result=spawnSync(process.execPath,[
  '--test','apps/neopass-authenticator/postgres-ceremony-store.pg.test.mjs'
],{stdio:'inherit',env:process.env});
process.exit(result.status===null?1:result.status);
