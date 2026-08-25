const ENDPOINT=import.meta.env.VITE_NEO_COUNTER_SYNC_ENDPOINT || '';

export type Session={merchantId:string;terminalId:string;staffId:string;permissions:string[];expiresAt:string|null};
let token='';
let current:Session|null=null;

function base(){return ENDPOINT.replace(/\/$/,'');}
export function sessionToken(){return token;}
export function currentSession(){return current;}
export function authHeaders():Record<string,string>{return token?{authorization:`Bearer ${token}`}:{}};

export async function login(input:{merchantId:string;terminalId:string;terminalSecret:string;staffId:string;pin:string}):Promise<Session>{
  if(!ENDPOINT) throw new Error('NEO Counter backend endpoint is not configured.');
  const res=await fetch(`${base()}/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  if(!res.ok) throw new Error(res.status===401?'Invalid terminal or staff credentials.':`Login failed (${res.status})`);
  const body=await res.json();
  token=body.token;
  current={merchantId:body.merchantId,terminalId:body.terminalId,staffId:body.staffId,permissions:body.permissions||[],expiresAt:body.expiresAt||null};
  return current;
}

export async function logout(){
  if(token&&ENDPOINT){try{await fetch(`${base()}/session`,{method:'DELETE',headers:authHeaders()});}catch{/* local logout still succeeds */}}
  token='';current=null;
}

export async function refreshSession():Promise<Session|null>{
  if(!token||!ENDPOINT) return null;
  const res=await fetch(`${base()}/session/me`,{headers:authHeaders()});
  if(!res.ok){token='';current=null;return null;}
  current=await res.json();return current;
}
