import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createStatementsService} from '../apps/neoscan/server/statements-service.mjs';

const OUT=path.resolve(process.env.NEOSCAN_STATEMENTS_OUT||'dist/api/neoscan/statements');
const ACCOUNT_REGISTRY=path.resolve(process.env.NEOSCAN_STATEMENT_ACCOUNT_REGISTRY||'apps/neoscan/data/public-statement-accounts.json');
const rawAccounts=String(process.env.NEOSCAN_STATEMENT_ACCOUNTS||'').trim();

async function loadAccounts(){
  if(rawAccounts){
    return [...new Set(rawAccounts.split(/[\s,]+/).map(v=>v.trim()).filter(Boolean))]
      .map(address=>({address,label:null,source:'environment'}));
  }
  const raw=JSON.parse(await readFile(ACCOUNT_REGISTRY,'utf8'));
  const rows=Array.isArray(raw?.accounts)?raw.accounts:[];
  const seen=new Set();
  return rows
    .filter(row=>row?.enabled!==false&&String(row?.address||'').trim())
    .map(row=>({address:String(row.address).trim(),label:String(row.label||'').trim()||null,source:'registry'}))
    .filter(row=>seen.has(row.address)?false:(seen.add(row.address),true));
}

const accounts=await loadAccounts();
const generatedAt=new Date().toISOString();
const commit=process.env.GITHUB_SHA||'local';

const cesEndpoint=String(process.env.NEOSCAN_CES_ENDPOINT||'').trim();
const cesAccount=String(process.env.NEOSCAN_CES_ACCOUNT||'').trim();
const cesToken=String(process.env.NEOSCAN_CES_TOKEN||'').trim();
const cesNetwork=String(process.env.NEOSCAN_CES_NETWORK||'').trim();
const cesConfigured=Boolean(cesEndpoint&&cesAccount&&cesToken);

const service=createStatementsService({
  bitcoinApi:process.env.NEOSCAN_BITCOIN_API,
  counterpartyApi:process.env.NEOSCAN_COUNTERPARTY_API,
  ces:{
    endpoint:cesEndpoint,
    account:cesAccount,
    network:cesNetwork,
    authMode:'bearer'
  }
});

await mkdir(OUT,{recursive:true});
const published=[];

for(const accountRow of accounts){
  const account=accountRow.address;
  const statement=await service.buildPublicStatement({
    address:account,
    includeCes:cesConfigured,
    cesToken:cesConfigured?cesToken:undefined
  });
  const requestId=`github:${commit.slice(0,12)}:${published.length+1}`;
  const envelope={
    ok:true,
    requestId,
    source:'github-actions-snapshot',
    generatedAt,
    label:accountRow.label,
    data:statement
  };
  const file=`${encodeURIComponent(account)}.json`;
  await writeFile(path.join(OUT,file),`${JSON.stringify(envelope,null,2)}\n`,'utf8');
  published.push({
    account,
    label:accountRow.label,
    file,
    reconciliationStatus:statement.reconciliationStatus,
    generatedAt:statement.generatedAt
  });
}

const manifest={
  schema:'neo.statement.snapshot-index.v1',
  source:'GitHub Actions',
  commit,
  generatedAt,
  readOnly:true,
  cesIncluded:cesConfigured,
  accountCount:published.length,
  accounts:published
};
await writeFile(path.join(OUT,'index.json'),`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(`Published ${published.length} NEO Statement snapshot(s) to ${OUT}`);
