const status=document.querySelector('#status');
async function send(message){const r=await chrome.runtime.sendMessage(message);if(r.error)throw new Error(r.error);return r.result;}
async function refresh(){const v=await send({kind:'vaultStatus'});status.textContent=v.address?'Encrypted wallet stored: '+v.address:'No wallet imported.';document.querySelector('#import').hidden=Boolean(v.address);document.querySelector('#create').hidden=Boolean(v.address);}
document.querySelector('#create').addEventListener('click',async()=>{
 try{const next=await send({kind:'createKey'});document.querySelector('#wif').value=next.wif;document.querySelector('#backup').textContent='New wallet: '+next.address+'. Back up the WIF displayed locally before encrypting. This is not your existing Freewallet address.';}
 catch(e){status.textContent=e.message;}
});
document.querySelector('#import').addEventListener('submit',async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;
 try{if(document.querySelector('#password').value!==document.querySelector('#confirm').value)throw new Error('Passwords do not match');
 await send({kind:'saveVault',wif:document.querySelector('#wif').value.trim(),password:document.querySelector('#password').value});document.querySelector('#import').reset();await refresh();}
 catch(e){status.textContent=e.message;}finally{button.disabled=false;}
});
refresh().catch(e=>status.textContent=e.message);

