/* Public read-only asset media. Editing requires the controlling wallet. */
(()=>{
 const frame=document.getElementById('crownAssetFrame'),input=document.getElementById('crownAssetInput');
 if(!frame||!input)return;
 document.getElementById('scanForm')?.addEventListener('submit',()=>{
  const asset=document.getElementById('scanInput')?.value?.trim();
  if(!asset||!(/^[A-Z][A-Z0-9_.-]{3,254}$/.test(asset)))return;
  input.value=asset;frame.src='https://crown.holytemples.org/assets/'+encodeURIComponent(asset)+'/explore.html';
 });
})();
