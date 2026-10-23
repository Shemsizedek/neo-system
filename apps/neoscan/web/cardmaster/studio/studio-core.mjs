// NCC-009: deterministic, client-side Crown artwork. No AI inference, network or custody.
// The renderer is shared unchanged by the browser and Node tests.
export const STUDIO_CARDS = Object.freeze([
  {id:'NEO-CARD-000001',name:'NOMNI MONETARY INDEX',sector:'Digital asset presentation',motif:'monolith',brief:'A faceted obsidian octahedron, luminous metallic vault geometry and orbital particle streams.'},
  {id:'NEO-CARD-000002',name:'SHELTON ESTATE REAL ESTATE FUND',sector:'Real estate presentation',motif:'skyline',brief:'A monumental architectural skyline, luminous glass tower, precision gold structural lines.'},
  {id:'NEO-CARD-000003',name:'CROWN CHAIN PRIVATE EQUITY',sector:'Private capital presentation',motif:'network',brief:'A luminous Crown network of connected spheres, sovereign data lattice, and digital crown emblem.'}
]);
export const STUDIO_PALETTES = Object.freeze({
  aurum:{label:'Aurum / Gold',base:'#0b1017',deep:'#03070b',light:'#f6db9a',accent:'#c59448',secondary:'#7a9b98',muted:'#958877'},
  azurite:{label:'Azurite / Blue',base:'#101b30',deep:'#060a16',light:'#d3e8ff',accent:'#6ebbf0',secondary:'#aaa2e0',muted:'#8b9bb5'},
  emerald:{label:'Verdant / Jade',base:'#0a241f',deep:'#04100c',light:'#d5eedf',accent:'#6bcdaf',secondary:'#dcbd75',muted:'#88a499'},
  ember:{label:'Ember / Copper',base:'#281218',deep:'#0f080d',light:'#ffe4c2',accent:'#f0a26d',secondary:'#e2cb83',muted:'#b19b9a'}
});
export const STUDIO_TEMPLATES = Object.freeze({
  sovereign:{label:'Sovereign',description:'Symmetric monumental geometry with a prestige frame.'},
  orbital:{label:'Orbital',description:'Cosmic circuitry, orbital guides and luminous traces.'},
  atlas:{label:'Atlas',description:'Architectural drafting grid with calibrated geometric plates.'}
});
const escape = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const safeText = (value,max)=>String(value??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
const txt=(x,y,string,size=24,fill='#f6db9a',extra='')=>`<text x="${x}" y="${y}" fill="${fill}" font-family="Georgia, Times New Roman, serif" font-size="${size}" ${extra}>${escape(string)}</text>`;
const line=(x1,y1,x2,y2,color,width=1,opacity=1)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
const rng=(seed)=>{let x=(seed|0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}};
function splitTitle(value){
  const words=value.split(/\s+/).filter(Boolean),rows=[];let row='';
  for(const word of words){if((row+' '+word).trim().length>27&&row){rows.push(row);row=word;}else row=(row+' '+word).trim();}
  if(row)rows.push(row);
  return rows.slice(0,3).map(row=>row.slice(0,32));
}
export function studioConfig(input={}){
  const card=STUDIO_CARDS.find(c=>c.id===input.card_id);
  if(!card)throw Error('card_not_allowlisted');
  const paletteId=input.palette??'aurum';
  const template=input.template??'sovereign';
  if(!Object.hasOwn(STUDIO_PALETTES,paletteId)||!Object.hasOwn(STUDIO_TEMPLATES,template))throw Error('invalid_design');
  const edition=input.edition??1,variant=input.variant??1,revision=input.revision??1;
  if(!Number.isSafeInteger(edition)||edition<1||edition>9999||!Number.isSafeInteger(variant)||variant<1||variant>9999||!Number.isSafeInteger(revision)||revision<1||revision>9999)throw Error('invalid_edition_variant_revision');
  const custom=safeText(input.title??card.name,70);
  if(!custom || custom.length>70)throw Error('invalid_title');
  return {card_id:card.id,title:custom,sector:card.sector,motif:card.motif,brief:card.brief,palette:paletteId,template,edition,variant,revision};
}
function background(p,template,variant){
  let backdrop=`<rect x="0" y="0" width="720" height="1040" fill="url(#base)"/>`;
  const r=rng(variant*3571+17);
  for(let i=0;i<70;i++){const x=Math.round(30+r()*660),y=Math.round(205+r()*530),radius=(r()*1.8+.4).toFixed(2);backdrop+=`<circle cx="${x}" cy="${y}" r="${radius}" fill="${p.light}" opacity="${(r()*.33+.08).toFixed(2)}"/>`;}
  if(template==='orbital'){
    for(let i=0;i<5;i++)backdrop+=`<ellipse cx="360" cy="500" rx="${170+i*34}" ry="${220+i*39}" transform="rotate(${i%2?24:-26} 360 500)" fill="none" stroke="${p.secondary}" stroke-width="1.3" opacity="${.21-i*.025}"/>`;
  }else if(template==='atlas'){
    for(let x=70;x<680;x+=44)backdrop+=line(x,212,x,802,p.secondary,1,.15);
    for(let y=215;y<805;y+=44)backdrop+=line(60,y,660,y,p.secondary,1,.15);
    backdrop+=`<circle cx="360" cy="511" r="250" fill="none" stroke="${p.light}" stroke-dasharray="2 8" opacity=".26"/>`;
  } else {
    backdrop+=`<path d="M75 805L360 285L645 805Z" stroke="${p.secondary}" stroke-width="1" fill="none" opacity=".25"/>`;
    backdrop+=`<circle cx="360" cy="514" r="241" fill="none" stroke="${p.accent}" stroke-width="1.7" opacity=".36"/>`;
  }
  return backdrop;
}
function monolith(p,v){
  const offset=((v*7)%25)-12;
  return `<ellipse cx="360" cy="760" rx="216" ry="40" fill="${p.accent}" opacity=".17"/>
  <path d="M${360+offset} 268L550 490L${360+offset} 752L170 490Z" fill="url(#gem)" stroke="${p.light}" stroke-width="7"/>
  <path d="M${360+offset} 268V752M170 490L550 490M${360+offset} 268L444 488L${360+offset} 752M${360+offset} 268L260 488L${360+offset} 752" stroke="${p.light}" stroke-width="2.7" fill="none" opacity=".72"/>
  <path d="M170 490L${360+offset} 590L550 490" stroke="${p.accent}" stroke-width="3" fill="none" opacity=".78"/>
  <circle cx="360" cy="498" r="46" fill="${p.base}" stroke="${p.light}" stroke-width="6"/>
  <circle cx="360" cy="498" r="19" fill="${p.accent}" opacity=".8"/>
  <path d="M215 795h290M244 813h232" stroke="${p.light}" stroke-width="4" opacity=".65"/>`;
}
function skyline(p,v){
  const h=18+(v%5)*8;
  let glass=`<path d="M100 765L100 486L186 447V765L211 765V337L397 263L421 765L459 765V444L615 391V765" fill="${p.base}" stroke="${p.light}" stroke-width="5"/>`;
  glass+=`<path d="M211 337L397 263M211 337L310 302V765M397 263L397 765M459 444L535 418V765" fill="none" stroke="${p.secondary}" stroke-width="5" opacity=".7"/>`;
  for(let y=340;y<757;y+=48)for(let x=231;x<393;x+=43){const visible=x>245&&y>340-h;glass+=visible?`<rect x="${x}" y="${y}" width="${22}" height="${29}" rx="2" fill="${p.accent}" opacity="${((x+y)%3)*.16+.3}"/>`:'';}
  for(let y=465;y<745;y+=48)for(let x=473;x<615;x+=44)glass+=`<rect x="${x}" y="${y}" width="${22}" height="${29}" rx="2" fill="${p.accent}" opacity=".42"/>`;
  glass+=`<path d="M60 765H660M90 792H630" stroke="${p.light}" stroke-width="5" opacity=".72"/><path d="M112 800L50 900M608 800L670 900" stroke="${p.accent}" stroke-width="2" opacity=".7"/>`;
  glass+=`<circle cx="520" cy="316" r="63" fill="${p.light}" opacity=".08" stroke="${p.light}" stroke-width="4"/>`;
  return glass;
}
function network(p,v){
  const count=9+(v%3),points=[];let shapes='';
  for(let i=0;i<count;i++){const angle=(i/count)*Math.PI*2-.35;const rad=207+(i%2)*34;points.push([Math.round(360+Math.cos(angle)*rad),Math.round(517+Math.sin(angle)*rad)]);}
  for(let i=0;i<count;i++){const [x,y]=points[i], [nx,ny]=points[(i+1)%count];shapes+=line(x,y,nx,ny,p.secondary,2,.66);shapes+=line(360,510,x,y,p.light,2,.45);}
  shapes+=`<path d="M251 459L292 393L337 425L360 360L383 425L428 393L469 459L445 528H275Z" fill="url(#gem)" stroke="${p.light}" stroke-width="5"/>
  <path d="M285 481h150M299 511h121" stroke="${p.accent}" stroke-width="4" opacity=".86"/>
  <circle cx="360" cy="515" r="32" fill="${p.deep}" stroke="${p.light}" stroke-width="5"/>`;
  for(const [x,y] of points)shapes+=`<circle cx="${x}" cy="${y}" r="11" fill="${p.accent}" stroke="${p.light}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="22" fill="none" stroke="${p.secondary}" opacity=".3"/>`;
  return shapes;
}
function cardFront(cfg,p){
  const title=splitTitle(cfg.title.toUpperCase());
  const titleRows=title.map((s,i)=>txt(65,155+i*35,s,30,p.light,'font-weight="bold"')).join('');
  const item=cfg.motif==='monolith'?monolith(p,cfg.variant):cfg.motif==='skyline'?skyline(p,cfg.variant):network(p,cfg.variant);
  return `${item}
    <rect x="47" y="837" width="626" height="132" rx="16" fill="${p.deep}" stroke="${p.accent}" opacity=".96"/>
    ${txt(69,870,'THE CROWN COLLECTION',16,p.accent,'letter-spacing="3"')}
    ${txt(69,918,cfg.sector.toUpperCase(),21,p.light)}
    ${txt(69,953,'UNVERIFIED ASSET PRESENTATION',12,p.muted,'letter-spacing="2"')}
    ${titleRows}`;
}
function cardBack(cfg,p){
  const name=splitTitle(cfg.title.toUpperCase());
  return `<circle cx="360" cy="482" r="210" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".58"/>
    <circle cx="360" cy="482" r="168" fill="${p.base}" stroke="${p.secondary}" stroke-width="1.5" opacity=".86"/>
    ${txt(360,446,'N',134,p.light,'font-weight="bold" text-anchor="middle"')}
    ${txt(360,512,'CROWN',34,p.accent,'letter-spacing="6" text-anchor="middle"')}
    ${txt(360,555,'STUDIO / PROJECT 144',16,p.muted,'letter-spacing="2" text-anchor="middle"')}
    <rect x="49" y="749" width="622" height="212" rx="14" fill="${p.deep}" stroke="${p.accent}" stroke-width="2"/>
    ${txt(68,794,'DIGITAL ARTWORK RECORD',19,p.light,'letter-spacing="2"')}
    ${txt(68,838,'REVISION '+String(cfg.revision).padStart(2,'0')+' / EDITION '+String(cfg.edition).padStart(4,'0'),18,p.accent)}
    ${txt(68,886,'Not a market quote, ownership record,',17,p.light)}
    ${txt(68,913,'reserve certificate or securities offer.',17,p.light)}
    ${name.map((s,i)=>txt(65,153+i*34,s,27,p.light,'font-weight="bold"')).join('')}`;
}
export function renderStudioSvg(input,face='front'){
  const cfg=studioConfig(input);
  if(!['front','back'].includes(face))throw Error('invalid_face');
  const p=STUDIO_PALETTES[cfg.palette];
  const defs=`<defs><linearGradient id="base" x1="0" x2="0.95" y1="0" y2="1"><stop stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient><linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.deep}"/><stop offset="0.45" stop-color="${p.secondary}"/><stop offset="1" stop-color="${p.base}"/></linearGradient><radialGradient id="glow"><stop stop-color="${p.accent}" stop-opacity=".22"/><stop offset="1" stop-color="${p.deep}" stop-opacity="0"/></radialGradient></defs>`;
  const border=`<rect x="13" y="13" width="694" height="1014" rx="26" fill="none" stroke="${p.accent}" stroke-width="9"/>
    <rect x="28" y="28" width="664" height="984" rx="19" fill="none" stroke="${p.light}" stroke-width="1.6" opacity=".65"/>
    <path d="M48 104h624M48 988h624" stroke="${p.accent}" stroke-width="2" opacity=".8"/>`;
  const header=`${txt(60,70,'N E O  /  C R O W N',21,p.accent,'font-weight="bold" letter-spacing="3"')}${txt(656,70,'CARDMASTER',13,p.light,'text-anchor="end" letter-spacing="2"')}`;
  const footer=txt(59,1008,cfg.card_id,13,p.muted)+txt(660,1008,`V${cfg.revision} · ${cfg.palette.toUpperCase()}`,13,p.accent,'text-anchor="end"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040" role="img" aria-label="${escape(cfg.title)} ${face} Crown Studio card"><title>${escape(cfg.title)} — ${face} side</title><desc>Generated procedural vector artwork. No market quote, backing, ownership, verified issuer, or securities offer is asserted.</desc>${defs}${background(p,cfg.template,cfg.variant)}<ellipse cx="360" cy="510" rx="324" ry="356" fill="url(#glow)"/>${border}${header}${face==='front'?cardFront(cfg,p):cardBack(cfg,p)}${footer}</svg>`;
}
export function studioPrompt(input){
  const cfg=studioConfig(input),palette=STUDIO_PALETTES[cfg.palette],template=STUDIO_TEMPLATES[cfg.template];
  return `Crown CARDMASTER creative direction (not a market, ownership or financial certification): ${cfg.brief} Premium portrait collectible card composition, 720x1040 proportion, ${palette.label} palette, ${template.label} style (${template.description}) Edition ${cfg.edition}, variant ${cfg.variant}. Create original artwork only; reserve legible negative space for separately added text. Do not add price tickers, asset reserve assertions, issuer verification logos, projected returns, performance charts, securities offering statements, or third-party brands. No public release without rights and factual review.`;
}
export function studioManifest(input,{frontHash,backHash,createdAt,previousFrontHash=null}={}){
  const cfg=studioConfig(input);
  for(const h of [frontHash,backHash])if(typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))throw Error('invalid_hash');
  if(previousFrontHash!==null && (typeof previousFrontHash!=='string'||!/^[a-f0-9]{64}$/.test(previousFrontHash)))throw Error('invalid_previous_hash');
  const at=new Date(createdAt);
  if(!Number.isFinite(at.getTime())||at.toISOString()!==createdAt)throw Error('invalid_timestamp');
  return {schema:'neo.crown.artwork-studio.v1',version:1,artwork_revision:cfg.revision,edition:cfg.edition,variant:cfg.variant,card_id:cfg.card_id,title:cfg.title,sector:cfg.sector,template:cfg.template,palette:cfg.palette,face_dimensions:{width:720,height:1040},generator:'deterministic_procedural_svg_v1',rendered_at_client_clock:createdAt,assets:{front:{name:'front.svg',sha256:frontHash},back:{name:'back.svg',sha256:backHash}},parent_front_sha256:previousFrontHash,ai_generated:false,ai_provider:null,price_embedded:false,market_data_verified:false,issuer_verified:false,backing_verified:false,ownership_verified:false,public_release_approved:false,provenance_notice:'Unsigned off-chain image digest and local creation timestamp. Neither constitutes issuance, ownership or market verification.',prompt_for_optional_ai_studio:studioPrompt(cfg)};
}
