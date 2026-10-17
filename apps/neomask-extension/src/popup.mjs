const id=new URLSearchParams(location.search).get('request');
const status=document.querySelector('#status'),form=document.querySelector('#approval');
async function send(message){const r=await chrome.runtime.sendMessage(message);if(r.error)throw new Error(r.error);return r.result;}
if(id){
 try{
  const p=await send({kind:'pending',id});
  document.querySelector('#request').textContent='Site: '+p.origin+' · Ledger: '+p.ledger+' · Account: '+p.address;
  document.querySelector('#details').textContent=p.type==='sign'?JSON.stringify(p.summary,null,2)+'\nIntent SHA-256: '+p.digest:'This site may see your public account for 10 minutes.';
  document.querySelector('#password-label').hidden=p.type!=='sign';
  document.querySelector('#password').required=p.type==='sign';
  document.querySelector('#approve').textContent=p.type==='sign'?'Approve & sign transaction':'Approve connection';
  form.hidden=false;
 }catch(e){status.textContent=e.message;}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;
 try{await send({kind:'decide',id,approve:true,password:document.querySelector('#password').value});status.textContent='Approved.';form.hidden=true;}
 catch(e){status.textContent=e.message;}
 finally{document.querySelector('#password').value='';button.disabled=false;}
});
document.querySelector('#reject').addEventListener('click',async()=>{try{await send({kind:'decide',id,approve:false});window.close();}catch(e){status.textContent=e.message;}});
document.querySelector('#revoke').addEventListener('click',async()=>{try{await send({kind:'revoke'});status.textContent='Site permissions revoked.';}catch(e){status.textContent=e.message;}});

