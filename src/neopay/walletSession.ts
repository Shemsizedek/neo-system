export type WalletRail='raw'|'unisat'|'xverse'
export type DiagnosticStage='idle'|'detection'|'connection'|'network'|'address'|'psbt'|'signing'|'broadcast'|'confirmation'
export type WalletDiagnostic={stage:DiagnosticStage;ok:boolean;message:string;at:string}
export type WalletReadiness={rail:WalletRail;ok:boolean;checkedAt:string;expiresAt:string;message:string}
const PREF='neopay.wallet.preferred.v1',DIAG='neopay.wallet.diagnostics.v1',READY='neopay.wallet.readiness.v1'
export const READINESS_TTL_MS=10*60*1000
export function preferredWallet():WalletRail{try{const v=localStorage.getItem(PREF);return v==='unisat'||v==='xverse'||v==='raw'?v:'raw'}catch{return'raw'}}
export function rememberPreferredWallet(v:WalletRail){try{localStorage.setItem(PREF,v)}catch{}}
export function recordWalletDiagnostic(stage:DiagnosticStage,ok:boolean,message:string){const d:WalletDiagnostic={stage,ok,message,at:new Date().toISOString()};try{const rows=walletDiagnostics();localStorage.setItem(DIAG,JSON.stringify([d,...rows].slice(0,30)))}catch{}return d}
export function walletDiagnostics():WalletDiagnostic[]{try{const v=JSON.parse(localStorage.getItem(DIAG)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
export function clearWalletDiagnostics(){try{localStorage.removeItem(DIAG)}catch{}}
function readReady():Partial<Record<WalletRail,WalletReadiness>>{try{const v=JSON.parse(localStorage.getItem(READY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
export function attestWalletReadiness(rail:WalletRail,message='Compatibility test passed.'){const now=Date.now(),r:WalletReadiness={rail,ok:true,checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+READINESS_TTL_MS).toISOString(),message};try{localStorage.setItem(READY,JSON.stringify({...readReady(),[rail]:r}))}catch{}return r}
export function revokeWalletReadiness(rail:WalletRail,message='Compatibility test failed.'){const now=Date.now(),r:WalletReadiness={rail,ok:false,checkedAt:new Date(now).toISOString(),expiresAt:new Date(now).toISOString(),message};try{localStorage.setItem(READY,JSON.stringify({...readReady(),[rail]:r}))}catch{}return r}
export function walletReadiness(rail:WalletRail=preferredWallet()):WalletReadiness|null{const r=readReady()[rail];if(!r||!r.ok||Date.parse(r.expiresAt)<=Date.now())return null;return r}
export function sendReadiness(){const rail=preferredWallet(),r=walletReadiness(rail);return{rail,ready:Boolean(r),attestation:r,reason:r?'Wallet compatibility check is current.':'Run Test Preferred Wallet before sending. Compatibility checks expire after 10 minutes.'}}
