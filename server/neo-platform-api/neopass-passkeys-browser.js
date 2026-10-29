// Native browser WebAuthn only: no third-party identity SDK or credential storage in JS.
const status=document.getElementById('passkey-status');
const buttons=[...document.querySelectorAll('[data-passkey-action]')];
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const encode=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function post(path,body={}) {
  const response=await fetch('/api/v1/auth/passkeys/'+path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok) throw Error(data.error); return data;
}
function optionsFromJSON(options,register) {
  const result={...options,challenge:decode(options.challenge)};
  if(register) result.user={...options.user,id:decode(options.user.id)};
  for(const key of ['allowCredentials','excludeCredentials']) if(options[key]) result[key]=options[key].map(c=>({...c,id:decode(c.id)}));
  return result;
}
function responseJSON(credential) {
  const r=credential.response;
  const result={id:credential.id,rawId:encode(credential.rawId),type:credential.type,authenticatorAttachment:credential.authenticatorAttachment,clientExtensionResults:credential.getClientExtensionResults(),response:{clientDataJSON:encode(r.clientDataJSON)}};
  if(r.attestationObject) { result.response.attestationObject=encode(r.attestationObject); result.response.transports=r.getTransports?.()||[]; }
  else { result.response.authenticatorData=encode(r.authenticatorData); result.response.signature=encode(r.signature); result.response.userHandle=r.userHandle?encode(r.userHandle):null; }
  return result;
}
async function run(register) {
  buttons.forEach(b=>b.disabled=true); status.textContent='Follow your device’s passkey prompt.';
  try {
    if(!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) throw Error('unsupported');
    const kind=register?'register':'authenticate';
    const options=await post(kind+'/options',register?{username:document.getElementById('passkey-username').value}:{});
    const publicKey=optionsFromJSON(options,register);
    const credential=register?await navigator.credentials.create({publicKey}):await navigator.credentials.get({publicKey});
    if(!credential) throw Error('cancelled');
    await post(kind+'/verify',responseJSON(credential));
    location.assign('/portal');
  } catch(error) {
    const messages={
      device_bound_passkey_required:'This authenticator offers a synced passkey. Choose a device-bound authenticator or a compatible security key.',
      passkey_username_invalid:'Choose a name with 3–64 letters, numbers, underscores or hyphens.',
      passkey_username_unavailable:'That account name is unavailable. Sign in with its existing passkey or choose another name.',
      neopass_passkey_storage_unavailable:'NEOpass passkey storage is not configured yet.',
      passkey_reauthentication_required:'Sign in with your existing passkey again before adding a new device.',
      unsupported:'This browser needs HTTPS and a compatible passkey authenticator.',
      NotAllowedError:'Passkey prompt cancelled or timed out. No sign-in was completed.',
      InvalidStateError:'This passkey is already registered. Choose Sign in instead.'
    };
    status.textContent=messages[error.message]||messages[error.name]||'Unable to verify the passkey. Try again with your registered device.';
  } finally {buttons.forEach(b=>b.disabled=false);}
}
document.getElementById('passkey-signin')?.addEventListener('click',()=>run(false));
document.getElementById('passkey-register-form')?.addEventListener('submit',event=>{event.preventDefault();run(true);});
fetch('/api/v1/auth/passkeys/status',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!data.configured){status.textContent='NEOpass passkey storage is not configured yet. Registration and sign-in are unavailable.';buttons.forEach(b=>b.disabled=true);}
}).catch(()=>{status.textContent='Unable to reach NEOpass. Please try again later.';buttons.forEach(b=>b.disabled=true);});
fetch('/api/v1/auth/session',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!data.authenticated) return;
  const input=document.getElementById('passkey-username');
  if(input){input.value=data.member.username;input.readOnly=true;}
  const details=document.querySelector('details');
  if(details){details.open=true;details.querySelector('summary').textContent='Add a second device passkey to your account';}
}).catch(()=>{});
