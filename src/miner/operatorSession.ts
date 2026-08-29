/// <reference types="vite/client" />

export type OperatorIdentity={id:string;displayName:string;role:string}
export type OperatorSession={operator:OperatorIdentity;csrfToken:string;expiresAt:number}

export const OPERATOR_API=(import.meta.env.VITE_NEO_MINER_OPERATOR_API||'').replace(/\/$/,'')
const CSRF_KEY='neo.operator.csrf'

export async function getOperatorSession():Promise<OperatorSession|null>{
  if(!OPERATOR_API)return null
  const r=await fetch(`${OPERATOR_API}/session`,{credentials:'include'})
  if(r.status===401)return null
  if(!r.ok)throw new Error(`Operator session ${r.status}`)
  const session=await r.json() as OperatorSession
  sessionStorage.setItem(CSRF_KEY,session.csrfToken)
  return session
}

export async function loginOperator(operatorId:string,password:string):Promise<OperatorSession>{
  if(!OPERATOR_API)throw new Error('Operator API URL is not configured.')
  const r=await fetch(`${OPERATOR_API}/session/login`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({operatorId,password})})
  const body=await r.json();if(!r.ok)throw new Error(body.error||`Operator login ${r.status}`)
  sessionStorage.setItem(CSRF_KEY,body.csrfToken)
  return body as OperatorSession
}

export async function logoutOperator(){
  if(!OPERATOR_API)return
  const csrf=sessionStorage.getItem(CSRF_KEY)||''
  await fetch(`${OPERATOR_API}/session/logout`,{method:'POST',credentials:'include',headers:csrf?{'x-csrf-token':csrf}:{}})
  sessionStorage.removeItem(CSRF_KEY)
}

export async function operatorFetch(path:string,init:RequestInit={}){
  if(!OPERATOR_API)throw new Error('Operator API URL is not configured.')
  const method=String(init.method||'GET').toUpperCase()
  const headers=new Headers(init.headers||{})
  if(method!=='GET'&&method!=='HEAD'){
    const csrf=sessionStorage.getItem(CSRF_KEY)||''
    if(!csrf)throw new Error('Operator CSRF session is missing. Sign in again.')
    headers.set('x-csrf-token',csrf)
  }
  return fetch(`${OPERATOR_API}${path}`,{...init,method,headers,credentials:'include'})
}
