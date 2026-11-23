/**
 * Project 144 — CES Bot read-only reports adapter.
 * Inject a separately authenticated session provider; no credentials, cookie jars,
 * network clients or login URLs are accepted by this component.
 *
 * Existing bot runtime remains stub by default. The caller may manually inject
 * this adapter into createNeoBotsDeploymentRuntime({ cesAdapter }).
 */
import { createHash } from 'node:crypto';
import { assertSafeCesReportRequest } from './reconciliation-gate.mjs';

const ORIGIN='https://www.community-exchange.org';
const REPORT_PATHS=Object.freeze({
 transactions:'/_admin/reptrades.asp',
 statistics:'/_admin/statsindex.asp',
 overview:'/_admin/groupmain.asp',
 conversionRates:'/_admin/convrates.asp',
});
const EXCHANGES=new Set(['NMNI','XCPC']);
const MAX_BYTES=65536;
const guard = (operation) => async () => ({
  ok:false,operation,mode:'disabled-value-movement',executable:false,
});

export function createCesBotReportAdapter({ sessionProvider, onAudit }={}){
 if(typeof sessionProvider!=='function') throw new Error('Authenticated session provider required');
 if(typeof onAudit!=='function') throw new Error('Sanitized audit sink required');
 async function readReport({exchange,report='transactions'}={}){
   const exchangeId=exchange?.exchangeId;
   if(!EXCHANGES.has(exchangeId))throw new Error('Unapproved CES exchange');
   if(!Object.prototype.hasOwnProperty.call(REPORT_PATHS,report))throw new Error('Unknown CES report');
   const path=REPORT_PATHS[report];
   assertSafeCesReportRequest(ORIGIN+path);
   const session=await sessionProvider({exchangeId,purpose:'report-read-only'});
   if(!session || session.authenticated!==true || session.readOnly!==true ||
     session.exchangeId!==exchangeId || typeof session.get!=='function') {
     throw new Error('Verified scoped CES report session unavailable');
   }
   // Session's sole permitted operation here is GET on a fixed, allowlisted path.
   const response=await session.get(path,{method:'GET',redirect:'manual'});
   const redirect=Number(response?.status)>=300 && Number(response.status)<400;
   if(!response || redirect || response.status!==200) throw new Error('CES report not available');
   const sourceURL=response.url || '';
   assertSafeCesReportRequest(sourceURL);
   if(sourceURL!==ORIGIN+path)throw new Error('CES report origin/path mismatch');
   const contentType=response.headers?.get?.('content-type')||'';
   if(!/^text\/html(?:;|$)/i.test(contentType))throw new Error('CES report content type mismatch');
   const declared=Number(response.headers?.get?.('content-length')||0);
   if(!Number.isFinite(declared)||declared>MAX_BYTES)throw new Error('CES report too large');
   if(typeof response.text!=='function')throw new Error('CES report body unavailable');
   const html=await response.text();
   const bytes=Buffer.byteLength(html,'utf8');
   if(bytes>MAX_BYTES)throw new Error('CES report too large');
   // Never pass unstructured report content (member/account PII, credentials or
   // URLs) into bot result, database, bank adapter, or logs.
   if(/<input\b[^>]*type\s*=\s*["']?password\b/i.test(html) ||
     /<form\b[^>]*action\s*=\s*["']?[^"'>]*login/i.test(html)) {
     throw new Error('CES report resolved to a login page');
   }
   const proof=Object.freeze({
     ok:true,mode:'authenticated-readonly-report-evidence',exchangeId,report,
     status:200,bytes,sha256:createHash('sha256').update(html).digest('hex'),
     rawReportStored:false,ledgerRowsParsed:0,bankingRecordsWritten:0,
     liveAccountBalanceVerified:false,valueMovementAuthorized:false,
   });
   await onAudit(Object.freeze({
     event:'ces_report_readonly',exchangeId,report,
     byteCount:bytes,sha256:proof.sha256,status:'observed',
   }));
   return proof;
 }
 return Object.freeze({
   readReport,
   reviewTransaction:(payload={})=>readReport({exchange:payload.exchange,report:'transactions'}),
   reviewVirtualTrader:(payload={})=>readReport({exchange:payload.exchange,report:'overview'}),
   reviewInterexchangeSettlement:(payload={})=>readReport({exchange:payload.exchange,report:'statistics'}),
   approveTransaction:guard('approveTransaction'),
   issueVDollars:guard('issueVDollars'),
   uploadPublication:guard('uploadPublication'),
   maintainSubscription:guard('maintainSubscription'),
 });
}
