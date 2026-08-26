export type WalletRail='raw'|'unisat'|'xverse'
export type DiagnosticStage='idle'|'detection'|'connection'|'network'|'address'|'psbt'|'signing'|'broadcast'|'confirmation'
export type WalletDiagnostic={stage:DiagnosticStage;ok:boolean;message:string;at:string}
const PREF='neopay.wallet.preferred.v1',DIAG='neopay.wallet.diagnostics.v1'
export function preferredWallet():WalletRail{try{const v=localStorage.getItem(PREF);return v==='unisat'||v==='xverse'||v==='raw'?v:'raw'}catch{return'raw'}}
export function rememberPreferredWallet(v:WalletRail){try{localStorage.setItem(PREF,v)}catch{}}
export function recordWalletDiagnostic(stage:DiagnosticStage,ok:boolean,message:string){const d:WalletDiagnostic={stage,ok,message,at:new Date().toISOString()};try{const rows=walletDiagnostics();localStorage.setItem(DIAG,JSON.stringify([d,...rows].slice(0,30)))}catch{}return d}
export function walletDiagnostics():WalletDiagnostic[]{try{const v=JSON.parse(localStorage.getItem(DIAG)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
export function clearWalletDiagnostics(){try{localStorage.removeItem(DIAG)}catch{}}
