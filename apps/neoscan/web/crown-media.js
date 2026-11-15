/* Public read-only asset media. Editing requires the controlling wallet.
 * NOMNI must never depend on a single domain to render its public record.
 * The fixed Counterparty description URL and TokenScan importer are separate systems.
 */
(()=>{
 const frame=document.getElementById('crownAssetFrame'),input=document.getElementById('crownAssetInput');
 if(!frame||!input)return;
 const pagesMirror=new URL('../crown-chain/',document.baseURI).href;
 const canonical=asset=>'https://crown.holytemples.org/assets/'+encodeURIComponent(asset)+'/explore.html';
 const display=asset=>{
  const normalized=String(asset||'').trim().toUpperCase();
  if(!normalized||!(/^[A-Z][A-Z0-9_.-]{3,254}$/.test(normalized)))return;
  input.value=normalized;
  // Verified NEO-controlled fallback: bypass the suspended Crown Render hostname.
  frame.src=normalized==='NOMNI'?pagesMirror:canonical(normalized);
 };
 document.getElementById('scanForm')?.addEventListener('submit',()=>{
  display(document.getElementById('scanInput')?.value);
 });
 const mediaForm=input.closest('form');
 mediaForm?.addEventListener('submit',event=>{
  if(String(input.value).trim().toUpperCase()!=='NOMNI')return;
  event.preventDefault();
  display('NOMNI');
 });
 // Preserve other asset routing, but ensure NOMNI has a presentation route at load.
 if(input.value.trim().toUpperCase()==='NOMNI')display('NOMNI');
})();
