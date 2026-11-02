// NEO/CES mobile-login preflight. Official CES login: https://ces.community/index.php
// Credential values stay in Render only. No source HTML, cookies, URLs containing
// query tokens, passwords or raw errors are logged or returned.
const ORIGIN='https://ces.community';
const LOGIN='/index.php', SUBMIT='/rlogin.php';
const ADMIN='NMNI0000';
const formRequired=/\<form\b[^>]*action\s*=\s*["']rlogin\.php["'][^>]*method\s*=\s*["']post["']/i;
const uidField=/\<input\b[^>]*name\s*=\s*["']uid["']/i;
const pwdField=/\<input\b[^>]*name\s*=\s*["']passwd["']/i;
const byField=/\<input\b[^>]*name\s*=\s*["']by["'][^>]*value\s*=\s*["']usr["']/i;
const signInButton=/\<button\b[^>]*name\s*=\s*["']action["'][^>]*value\s*=\s*["']login["']/i;
const loginForm=/\<form\b[^>]*action\s*=\s*["']rlogin\.php["']/i;
const memberMarker=/\bNMNI0000\b/i;
const logoutMarker=/(?:logout|log\s*out|sign\s*out)(?:\.php|\b)/i;
const DISALLOWED_QUERY=/./;
function safeLocation(raw) {
  if(typeof raw!=='string'||!raw.length)return null;
  try{
    const u=new URL(raw,ORIGIN+LOGIN);
    if(u.origin!==ORIGIN||u.username||u.password||DISALLOWED_QUERY.test(u.search)||u.hash)return null;
    if(!/^\/[a-z][a-z0-9_/-]*\.php$/i.test(u.pathname))return null;
    if(/(?:logout|reset|register|transfer|payment|credit|delete|edit|post|submit)/i.test(u.pathname))return null;
    return u;
  }catch{return null}
}
function responseCookies(response){
  const list=typeof response.headers?.getSetCookie==='function'
    ? response.headers.getSetCookie()
    : (response.headers?.get('set-cookie')?[response.headers.get('set-cookie')]:[]);
  return list.filter(Boolean).map(x=>String(x).split(';',1)[0]).filter(x=>/^[a-z0-9_-]{1,60}=[^;\r\n]{1,2048}$/i.test(x));
}
function cookieHeader(jar){return [...jar.entries()].map(([name,value])=>name+'='+value).join('; ')}
function updateJar(jar,response){
  for(const pair of responseCookies(response)){
    const idx=pair.indexOf('='),k=pair.slice(0,idx),v=pair.slice(idx+1);
    if(v)jar.set(k,v);else jar.delete(k);
  }
}
async function request(fetchImpl,url,options){
  return fetchImpl(url,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});
}
export async function probeCesMobileMemberLogin({env=process.env,fetchImpl=fetch}={}){
  const username=env.NEO_CES_NMNI_USERNAME;
  const password=env.NEO_CES_NMNI_PASSWORD;
  if(username!==ADMIN||typeof password!=='string'||!password){
    return {result:'credential_configuration_unverified',memberAuthenticated:false,adminAuthenticated:false};
  }
  const jar=new Map();
  let initial;
  try{initial=await request(fetchImpl,ORIGIN+LOGIN,{method:'GET'});}
  catch{return {result:'login_page_unavailable',memberAuthenticated:false,adminAuthenticated:false}}
  if([401,403,429].includes(initial.status))return {result:'upstream_access_denied',stage:'login_page',httpStatus:initial.status,memberAuthenticated:false,adminAuthenticated:false};
  if(initial.status!==200)return {result:'login_page_unavailable',stage:'login_page',httpStatus:initial.status,memberAuthenticated:false,adminAuthenticated:false};
  updateJar(jar,initial);
  let html;
  try{html=await initial.text()}catch{return {result:'login_page_unavailable',memberAuthenticated:false,adminAuthenticated:false}}
  if(html.length>200000||!formRequired.test(html)||!uidField.test(html)||!pwdField.test(html)||!byField.test(html)||!signInButton.test(html)){
    return {result:'unverified_mobile_form',memberAuthenticated:false,adminAuthenticated:false};
  }
  // The CES mobile HTML uses a named submit button; browsers submit its
  // action=login value. Without this field CES can redirect to login again.
  const body=new URLSearchParams({uid:username,passwd:password,by:'usr',timezone:'UTC',action:'login'});
  let posted;
  try{posted=await request(fetchImpl,ORIGIN+SUBMIT,{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded',...(jar.size?{cookie:cookieHeader(jar)}:{})},
    body
  });}
  catch{return {result:'login_submit_unavailable',memberAuthenticated:false,adminAuthenticated:false}}
  if([401,403,429].includes(posted.status))return {result:'upstream_access_denied',stage:'login_submit',httpStatus:posted.status,memberAuthenticated:false,adminAuthenticated:false};
  updateJar(jar,posted);
  let protectedPage=posted;
  if([301,302,303].includes(posted.status)){
    const target=safeLocation(posted.headers.get('location'));
    if(!target)return {result:'unverified_redirect',memberAuthenticated:false,adminAuthenticated:false};
    try{protectedPage=await request(fetchImpl,target.href,{
      method:'GET',headers:jar.size?{cookie:cookieHeader(jar)}:{}
    });}
    catch{return {result:'protected_page_unavailable',memberAuthenticated:false,adminAuthenticated:false}}
  }
  if(protectedPage.status!==200)return {result:'protected_page_unavailable',httpStatus:protectedPage.status,memberAuthenticated:false,adminAuthenticated:false};
  let signedInHtml;
  try{signedInHtml=await protectedPage.text()}catch{return {result:'protected_page_unavailable',memberAuthenticated:false,adminAuthenticated:false}}
  // A redirect or successful HTTP response alone never proves account control.
  // Enforce both user identifier and authenticated navigation indicators.
  const signals={
    accountMarkerFound:memberMarker.test(signedInHtml),
    signOutFound:logoutMarker.test(signedInHtml),
    loginFormReturned:loginForm.test(signedInHtml),
    responseKind:protectedPage===posted?'inline':'same_origin_redirect'
  };
  if(signedInHtml.length>200000||!signals.accountMarkerFound||!signals.signOutFound||signals.loginFormReturned)
    return {result:'member_session_unverified',memberAuthenticated:false,adminAuthenticated:false,signals};
  return {result:'member_session_verified',memberAuthenticated:true,adminAuthenticated:false};
}
export async function runCesMobileLoginPreflight({env=process.env,fetchImpl=fetch,logger=x=>console.info(JSON.stringify(x))}={}){
  const result=await probeCesMobileMemberLogin({env,fetchImpl});
  logger({event:'ces_nmni_mobile_preflight',...result});
  return result;
}
