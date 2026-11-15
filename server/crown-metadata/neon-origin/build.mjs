import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reproducible, immutable-content build for the public NOMNI Neon Functions origin.
// No keys, signing capability, database writes, or network access are involved.
const root = new URL('../attachments/NOMNI/', import.meta.url);
const expectedHost = 'https://crown.holytemples.org/assets/NOMNI/tokenscan.json';
const expectedSha256 = '00472d01de84f4d876d7cd6ca1fa53a844a0b7929f93f97cd5dfb4c28e7bb7e6';

export async function buildCrownOrigin(output = new URL('./dist/index.mjs', import.meta.url)) {
  const load = async (name) => readFile(new URL(name, root));
  const [mainBytes, nestedBytes, infoBytes, billBytes, jpeg] = await Promise.all([
    load('tokenscan.json'),
    load('assets/NOMNI/tokenscan.json'),
    load('assets/NOMNI/info.json'),
    load('assets/NOMNI/bill-1.json'),
    load('assets/NOMNI/nomni-bill-1.jpg'),
  ]);
  const main = mainBytes.toString('utf8');
  const bill = billBytes.toString('utf8');
  const meta = JSON.parse(main), record = JSON.parse(bill);
  const sha = createHash('sha256').update(jpeg).digest('hex');
  assert.equal(main, nestedBytes.toString('utf8'), 'root/nested JSON mismatch');
  assert.equal(main, infoBytes.toString('utf8'), 'root/info JSON mismatch');
  assert.equal(meta.asset, 'NOMNI');
  assert.equal(record.token.asset_id, '6195210');
  assert.equal(record.token.metadata_url, expectedHost);
  assert.equal(sha, expectedSha256, 'artwork integrity mismatch');
  assert.equal(sha, record.sha256);
  assert.equal(sha, meta.denominations[0].artwork_sha256);
  assert.equal(jpeg.length, record.size_bytes);
  const bundle = [
    "import { createHash } from 'node:crypto';",
    'const metadata=' + JSON.stringify(main) + ';',
    'const bill=' + JSON.stringify(bill) + ';',
    'const jpeg=Buffer.from(' + JSON.stringify(jpeg.toString('base64')) + ",'base64');",
    'const m=JSON.parse(metadata),b=JSON.parse(bill);',
    "if(m.asset!=='NOMNI'||b.asset!=='NOMNI'||b.token.asset_id!=='6195210')throw Error('asset identity mismatch');",
    "const sha=createHash('sha256').update(jpeg).digest('hex');",
    "if(sha!==b.sha256||jpeg.length!==b.size_bytes||sha!==m.denominations[0].artwork_sha256)throw Error('artwork integrity mismatch');",
    "const routes={",
    " '/assets/NOMNI/tokenscan.json':[metadata,'application/json; charset=utf-8'],",
    " '/assets/NOMNI/info.json':[metadata,'application/json; charset=utf-8'],",
    " '/assets/NOMNI/bill-1.json':[bill,'application/json; charset=utf-8'],",
    " '/assets/NOMNI/nomni-bill-1.jpg':[jpeg,'image/jpeg'],",
    " '/tokenscan.json':[metadata,'application/json; charset=utf-8'],",
    " '/info.json':[metadata,'application/json; charset=utf-8'],",
    " '/bill-1.json':[bill,'application/json; charset=utf-8'],",
    " '/nomni-bill-1.jpg':[jpeg,'image/jpeg']",
    '};',
    'export default {async fetch(req){',
    " const url=new URL(req.url),h={'Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=300'};",
    " if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...h,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});",
    " if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{...h,Allow:'GET, HEAD, OPTIONS'}});",
    " if(url.pathname==='/healthz')return new Response(req.method==='HEAD'?null:JSON.stringify({status:'ok',asset:'NOMNI',asset_id:'6195210',sha256:sha}),{status:200,headers:{...h,'Content-Type':'application/json; charset=utf-8'}});",
    " const item=routes[url.pathname];return item?new Response(req.method==='HEAD'?null:item[0],{status:200,headers:{...h,'Content-Type':item[1]}}):new Response('Not Found',{status:404,headers:h});",
    '}};',
  ].join('\n');
  const path = fileURLToPath(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bundle, 'utf8');
  return { output: path, bytes: Buffer.byteLength(bundle), imageSha256: sha };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildCrownOrigin();
  console.log(JSON.stringify(result));
}
