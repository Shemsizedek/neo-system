import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createGissAuthorizationBridge } from './giss-authorization-bridge.mjs'

const careersRedirect='https://careers.example/api/neopass/callback'
const verifier='v'.repeat(43)
const challenge=createHash('sha256').update(verifier).digest('base64url')
function fixture(careersRedirectOption){
 const codes=new Map()
 const handler=createGissAuthorizationBridge({
  careersRedirect:careersRedirectOption,
  codeStore:{async issue(k,v){codes.set(k,v)},async consume(k){const v=codes.get(k);codes.delete(k);return v}},
  authService:{async session(){return {neopassStatus:'active',email:'student@example.org'}}},
  subjectResolver:()=> 'student1',
  gissService:{async readState(s){return {subject:s,enrollment:{status:'enrolled'}}}},
  jwtSecret:'fixture-only',now:()=>1000000
 })
 return handler
}
async function request(handler,path,method='GET',body='',headers={}){
 const req={url:path,method,headers,async *[Symbol.asyncIterator](){yield body}}
 const res={status:null,headers:{},payload:'',setHeader(k,v){this.headers[k]=v},writeHead(n,h={}){this.status=n;Object.assign(this.headers,h)},end(v=''){this.payload=v}}
 await handler(req,res)
 return res
}
function url(client='neo-careers',redirect=careersRedirect){
 return '/auth/giss/authorize?'+new URLSearchParams({client_id:client,redirect_uri:redirect,state:'s'.repeat(43),code_challenge:challenge,code_challenge_method:'S256'})
}
test('Careers client remains unregistered by default',async()=>{
 assert.equal((await request(fixture(null),url())).status,400)
})
test('Careers client displays its own explicit consent',async()=>{
 const r=await request(fixture(careersRedirect),url())
 assert.equal(r.status,200)
 assert.match(r.payload,/NEO Careers/)
})
test('client-bound authorization code cannot be exchanged for another client',async()=>{
 const h=fixture(careersRedirect)
 const consent=await request(h,url(),'POST','consent=allow',{origin:'https://egov.holytemples.org'})
 assert.equal(consent.status,303)
 const code=new URL(consent.headers.location).searchParams.get('code')
 const wrong=new URLSearchParams({client_id:'gisd-office',redirect_uri:careersRedirect,code,code_verifier:verifier})
 assert.equal((await request(h,'/auth/giss/token','POST',wrong.toString())).status,400)
})
