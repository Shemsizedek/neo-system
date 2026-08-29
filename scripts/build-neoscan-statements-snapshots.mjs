import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createStatementsService} from '../apps/neoscan/server/statements-service.mjs';

const OUT=path.resolve(process.env.NEOSCAN_STATEMENTS_OUT||'dist/api/neoscan/statements');
const rawAccounts=String(process.env.NEOSCAN_STATEMENT_ACCOUNTS||'').trim();
const accounts=[...new Set(rawAccounts.split(/[\s,]+/).map(v=>v.trim()).filter(Boolean))];
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

for(const account of accounts){
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
    data:statement
  };
  const file=`${encodeURIComponent(account)}.json`;
  await writeFile(path.join(OUT,file),`${JSON.stringify(envelope,null,2)}\n`,'utf8');
  published.push({account,file,reconciliationStatus:statement.reconciliationStatus,generatedAt:statement.generatedAt});
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
