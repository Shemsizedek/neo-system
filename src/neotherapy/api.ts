export type NeotherapyStatus={service:string;version:string;storage:string;persistent:boolean;boundary:string}
async function request(action:string,method='GET',body?:unknown){const r=await fetch('/api/neotherapy?action='+encodeURIComponent(action),{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.error||'NEOTHERAPY_API_ERROR');return data}
export const neotherapyApi={
 status:()=>request('status') as Promise<NeotherapyStatus>,
 consent:(body:unknown)=>request('consent','POST',body),
 credential:(body:unknown)=>request('credential','POST',body),
 authorize:(body:unknown)=>request('authorize','POST',body),
 session:(body:unknown)=>request('session','POST',body)
}
