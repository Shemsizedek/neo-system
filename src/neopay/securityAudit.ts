const KEY='neopay.security.audit.v1'
export type AuditEventType='wallet_unlock'|'wallet_lock'|'policy_change'|'transaction_blocked'|'elevated_approval'|'signing_attempt'|'broadcast'|'confirmation'
export type AuditEvent={id:string;type:AuditEventType;at:string;message:string;previousHash:string;hash:string}
function clean(s:string){return s.replace(/(seed|private.?key|signature|psbt)\s*[:=]\s*\S+/gi,'[REDACTED]').slice(0,500)}
function fnv(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
function payload(e:Omit<AuditEvent,'hash'>){return`${e.id}|${e.type}|${e.at}|${e.message}|${e.previousHash}`}
export function auditEvents():AuditEvent[]{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
export function appendAudit(type:AuditEventType,message:string){const rows=auditEvents(),previousHash=rows[0]?.hash||'GENESIS',base={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,type,at:new Date().toISOString(),message:clean(message),previousHash},event={...base,hash:fnv(payload(base))};localStorage.setItem(KEY,JSON.stringify([event,...rows].slice(0,250)));return event}
export function verifyAuditChain(){const rows=auditEvents();for(let i=0;i<rows.length;i++){const e=rows[i],expectedPrevious=rows[i+1]?.hash||'GENESIS';if(e.previousHash!==expectedPrevious||e.hash!==fnv(payload({id:e.id,type:e.type,at:e.at,message:e.message,previousHash:e.previousHash})))return{valid:false,count:rows.length,brokenAt:i}}return{valid:true,count:rows.length}}
export function clearAuditLog(){localStorage.removeItem(KEY)}
