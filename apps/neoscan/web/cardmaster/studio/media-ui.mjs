import {createMediaStore,importImage,pngDataUrl} from './media-store.mjs';
import {MEDIA_PROVIDERS} from './media-core.mjs';

// UI facade for opt-in local artwork imports; no remote uploads or paid-provider calls.
export function setupMediaUI({notice}={}){
  const $=id=>document.getElementById(id);
  const store=createMediaStore(),selector=$('mediaSelect'),vault=$('mediaPreviewList'),status=$('mediaVaultStatus'),form=$('mediaForm');
  let thumbs=[],records=[],ready;
  function message(text){status.textContent=text;if(notice)notice.textContent=text;}
  function cleanThumbs(){for(const url of thumbs)URL.revokeObjectURL(url);thumbs=[];}
  const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
  async function refresh(preferred=''){
    records=await store.list();
    const selected=preferred||selector.value;
    selector.replaceChildren(new Option('Procedural artwork only',''));
    for(const r of records)selector.add(new Option(r.title+' · '+MEDIA_PROVIDERS[r.provider],r.id));
    selector.value=records.some(r=>r.id===selected)?selected:'';
    $('mediaCount').textContent='Local vault · '+records.length+' / 12 assets';
    cleanThumbs();vault.replaceChildren();
    if(!records.length){vault.append(text('div','No imported images yet. Upload an artwork file you are authorized to use to build a mixed-media Crown card.','media-empty'));return;}
    for(const record of records){
      const panel=document.createElement('article');panel.className='media-item';
      const container=await store.get(record.id);if(!container)continue;
      const url=URL.createObjectURL(container.blob);thumbs.push(url);
      const img=document.createElement('img');img.alt='Imported local image '+record.title;img.src=url;img.loading='lazy';panel.append(img);
      panel.append(text('h4',record.title));
      panel.append(text('p',MEDIA_PROVIDERS[record.provider]+' · source declared by user'));
      panel.append(text('p','Rights: '+record.rights_label+' (self-attested, not reviewed)'));
      panel.append(text('p',record.sha256.slice(0,20)+'…','media-hash'));
      const buttons=document.createElement('div');buttons.className='media-actions';
      const apply=text('button','Use on card');apply.type='button';apply.addEventListener('click',()=>{selector.value=record.id;message('Selected '+record.title+'. Choose Generate artwork to create a new card revision.');window.scrollTo?.({top:0,behavior:'smooth'});});
      const remove=text('button','Remove','remove');remove.type='button';remove.addEventListener('click',async()=>{
        if(!window.confirm('Delete '+record.title+' from this browser? Old revisions that reference it can no longer be reconstructed unless you reimport matching content.'))return;
        try{await store.remove(record.id);await refresh();message('Removed local image. Past revision digests are retained but may not be reconstructible.');}catch(e){message('Removal failed: '+String(e.message||e));}
      });
      buttons.append(apply,remove);panel.append(buttons);vault.append(panel);
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=$('importMedia');button.disabled=true;message('Validating raster data, rights declaration and PNG metadata…');
    try{
      const file=$('mediaFile').files?.[0];if(!file)throw new Error('Choose an image first.');
      const record=await importImage(file,{
        title:$('mediaTitle').value,
        provider:$('mediaProvider').value,
        creator:$('mediaCreator').value,
        rights:$('mediaRights').value,
        source:$('mediaReference').value,
        rightsConfirmed:$('mediaConsent').checked
      },store);
      await refresh(record.id);
      form.reset();
      message('Imported '+record.title+' as sanitized PNG; SHA-256 '+record.sha256.slice(0,16)+'… . Select Generate artwork to create an illustrated revision. Source/rights claims are user-declared.');
    }catch(e){message('Image not imported: '+String(e.message||e));}
    finally{button.disabled=false;}
  });
  selector.addEventListener('change',()=>{if(notice)notice.textContent=selector.value?'Imported image selected. Click Generate artwork for an updated card.':'Procedural-only edition selected. Click Generate artwork.';});
  ready=(async()=>{
    await refresh();
    status.textContent=(await store.persistent())?'Images are saved in this browser only. No server upload.':'Private in-memory vault (browser storage unavailable). Download artwork before leaving.';
  })().catch(e=>{status.textContent='Media vault unavailable: '+String(e.message||e);});
  return {
    ready,selectedId:()=>selector.value,
    async mediaFor(id){
      await ready;
      if(!id)return null;
      const entry=await store.get(id);
      if(!entry)throw new Error('Linked artwork missing from this browser. Reimport the matching image or create a procedural-only revision.');
      return {record:entry.record,dataUri:await pngDataUrl(entry.blob)};
    },
    async select(id){await ready;if(id&&!records.some(r=>r.id===id))throw new Error('Linked artwork no longer in media vault');selector.value=id||'';}
  };
}
