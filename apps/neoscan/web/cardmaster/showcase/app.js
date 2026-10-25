(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('showcaseForm'),button=$('generate'),status=$('renderStatus'),overlay=$('previewOverlay');
  const preview=$('cardPreview'),fields=$('previewFields');
  const faceButtons={front:$('frontFace'),back:$('backFace')};
  const downloads=[$('downloadSvg'),$('downloadPng'),$('downloadJson')];
  let active=null,activeParams='',activeFace='front',svgCache={},objectUrl=null,version=0;
  function isPreview(){return form.elements.mode.value==='preview';}
  function setMode(){fields.hidden=!isPreview();}
  function message(text){status.textContent=text;}
  function enabled(yes){for(const b of downloads)b.disabled=!yes;}
  function reportFailure(error){
    overlay.hidden=false;overlay.textContent='PREVIEW UNAVAILABLE';
    message('Card could not be verified or generated: '+(error instanceof Error?error.message:'source unavailable')+'. If this is an existing asset, check Counterparty connectivity or use an explicitly unissued preview.');
  }
  function queryForForm(){
    const asset=$('asset').value.trim();
    if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset)||asset.startsWith('.')||asset.endsWith('.')||asset.includes('..'))throw Error('Enter a valid asset identifier with no path separators');
    const mode=isPreview()?'preview':'observed';
    const p=new URLSearchParams({asset,mode,style:$('style').value});
    if(mode==='preview'){
      p.set('instrument_type',$('instrumentType').value);
      p.set('network',$('network').value);
      const title=$('title').value.trim();
      if(title)p.set('title',title);
    }
    return p.toString();
  }
  function assetName(){return (active?.payload?.asset||'crown').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,64);}
  function urlFor(params,format,face){
    const p=new URLSearchParams(params);
    p.set('format',format);
    if(face)p.set('face',face);
    return '/api/crown/showcase?'+p.toString();
  }
  async function read(url,expected,signal){
    const response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',headers:{accept:expected},signal});
    if(!response.ok)throw Error('source returned HTTP '+response.status);
    return response;
  }
  function setFacts(card){
    const p=card.payload;
    $('recordMode').textContent=p.mode==='OBSERVED_COUNTERPARTY_ASSET'?'COUNTERPARTY PUBLIC ASSET · OBSERVED':'UNISSUED DESIGN PREVIEW';
    $('recordAsset').textContent=p.asset;
    $('recordType').textContent=p.classification.label;
    $('recordEvidence').textContent=p.classification.status.replaceAll('_',' ');
    $('recordLedger').textContent=p.provenance.ledger_observed?'Public asset fetched; issuer and wallet control not independently verified':'No issued asset or transaction verified';
    $('recordMetadata').textContent=p.provenance.metadata_status.replaceAll('_',' ');
    $('recordPrice').textContent='No verified market quotation';
    $('recordHash').textContent=card.integrity.sha256.slice(0,26)+'…';
    $('recordHash').title=card.integrity.sha256;
    $('recordLink').href=urlFor(activeParams,'json');
  }
  async function loadFace(face,operation){
    if(!active)throw Error('Generate a card before changing faces');
    const key=face;
    if(!svgCache[key]){
      const response=await read(urlFor(activeParams,'svg',face),'image/svg+xml',operation);
      const value=await response.text();
      if(!value.startsWith('<?xml')||!value.includes('<svg')||value.length>200000)throw Error('invalid vector artwork from service');
      svgCache[key]=value;
    }
    return svgCache[key];
  }
  async function displayFace(face,expectedVersion){
    const svg=await loadFace(face);
    if(expectedVersion!==version)return;
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const previous=objectUrl;objectUrl=url;preview.src=url;
    if(previous)URL.revokeObjectURL(previous);
    activeFace=face;
    for(const key of ['front','back']){
      const selected=face===key;
      faceButtons[key].classList.toggle('active',selected);
      faceButtons[key].setAttribute('aria-pressed',String(selected));
    }
    overlay.hidden=true;
    message((active.payload.mode==='OBSERVED_COUNTERPARTY_ASSET'?'Observed public Counterparty asset':'Unissued design preview')+
      ' · '+active.payload.classification.label+' · '+face+' face ready. The image is an off-chain showcase, not a token or proof of asset backing.');
  }
  async function generate(){
    const current=++version;
    enabled(false);button.disabled=true;active=null;svgCache={};
    overlay.hidden=false;overlay.textContent='READING SOURCE & GENERATING CARD';
    message('Generating card with provenance and financial-claims safeguards…');
    try{
      const params=queryForForm();const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),30000);
      let payload;
      try{payload=await (await read(urlFor(params,'json'),'application/json',controller.signal)).json();}
      finally{clearTimeout(timer);}
      if(current!==version)return;
      if(payload?.payload?.schema!=='NEO-CROWN-LAYER3-SHOWCASE-V1'||!payload.integrity?.sha256||
         payload.payload.issuance?.safe_to_issue!==false||payload.payload.market?.price!==null)throw Error('unsafe or incomplete card payload');
      active=payload;activeParams=params;
      setFacts(payload);
      await displayFace('front',current);
      if(current===version){
        enabled(true);
        const newUrl=new URL(window.location.href);
        newUrl.search=new URLSearchParams(params).toString();
        history.replaceState(null,'',newUrl.toString());
      }
    }catch(error){if(current===version)reportFailure(error);}
    finally{if(current===version)button.disabled=false;}
  }
  function save(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async function selectFace(face){
    if(!active)return;
    overlay.hidden=false;overlay.textContent='RENDERING '+face.toUpperCase();
    try{await displayFace(face,version);}catch(error){reportFailure(error);}
  }
  async function pngExport(){
    if(!active)return;
    const button=$('downloadPng');button.disabled=true;
    message('Rasterizing deterministic SVG locally in this browser. No image service is contacted…');
    let url;
    try{
      const svg=await loadFace(activeFace);
      url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
      const image=new Image();
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('browser SVG rendering failed'));image.src=url;});
      const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=2080;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('browser canvas unavailable');
      ctx.drawImage(image,0,0,1440,2080);
      const output=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding unavailable')),'image/png'));
      save(output,'NEO-L3-'+assetName()+'-'+activeFace+'.png');
      message('PNG exported at 1440 × 2080 pixels. The image confers no issuer authority, contractual rights or financial assurances.');
    }catch(error){message('PNG export failed: '+(error instanceof Error?error.message:'browser error'));}
    finally{if(url)URL.revokeObjectURL(url);button.disabled=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();generate();});
  for(const el of form.querySelectorAll('input[name="mode"]'))el.addEventListener('change',setMode);
  faceButtons.front.addEventListener('click',()=>selectFace('front'));
  faceButtons.back.addEventListener('click',()=>selectFace('back'));
  $('downloadSvg').addEventListener('click',async()=>{
    if(!active)return;
    try{
      const svg=await loadFace(activeFace);
      save(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'NEO-L3-'+assetName()+'-'+activeFace+'.svg');
      message('SVG downloaded · deterministic off-chain card, not a signed token.');
    }catch(error){message('SVG export failed: '+String(error.message||error));}
  });
  $('downloadPng').addEventListener('click',pngExport);
  $('downloadJson').addEventListener('click',()=>{
    if(!active)return;
    save(new Blob([JSON.stringify(active,null,2)+'\n'],{type:'application/json'}),'NEO-L3-'+assetName()+'-provenance.json');
    message('Provenance JSON exported. Its SHA-256 checksum is content integrity, not a Bitcoin proof or issuer signature.');
  });
  const urlParams=new URLSearchParams(window.location.search);
  const mode=urlParams.get('mode')==='preview'?'preview':'observed';
  form.querySelector('input[name="mode"][value="'+mode+'"]').checked=true;
  for(const name of ['asset','instrument_type','network','style','title']){
    const element=form.elements[name],value=urlParams.get(name);
    if(!element||value===null)continue;
    if(element.tagName==='SELECT'){if([...element.options].some(opt=>opt.value===value))element.value=value;}
    else element.value=value.slice(0,element.maxLength>0?element.maxLength:255);
  }
  setMode();
  generate();
})();
