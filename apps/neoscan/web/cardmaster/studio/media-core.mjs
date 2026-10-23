// NCC-010 browser-local artwork intake contracts. No network calls, authorizations or independently verified rights.
export const MEDIA_PROVIDERS=Object.freeze({
  original:'Original artwork / own work',
  chatgpt:'ChatGPT — manually exported illustration',
  canva:'Canva — manually exported illustration',
  elevenlabs:'ElevenLabs — manually exported illustration',
  other:'Other tool or commissioned creator'
});
export const MEDIA_RIGHTS=Object.freeze({
  created:'I created this artwork and may use it',
  licensed:'I have a license permitting this use',
  commissioned:'I have written permission to use it'
});
export const MEDIA_MAX_INPUT_BYTES=6*1024*1024;
export const MEDIA_MAX_PNG_BYTES=4*1024*1024;
export const MEDIA_MAX_IMAGE_SIDE=1600;
export const MEDIA_MAX_ITEMS=12;
export const MEDIA_MAX_TOTAL_BYTES=24*1024*1024;
const shaPattern=/^[0-9a-f]{64}$/;
const safeText=(v,max=140)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);

export function sniffRasterMime(bytes){
  if(!(bytes instanceof Uint8Array))throw new Error('invalid_image_header');
  if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=12&&[82,73,70,70].every((v,i)=>bytes[i]===v)&&[87,69,66,80].every((v,i)=>bytes[8+i]===v))return 'image/webp';
  throw new Error('unsupported_image_type');
}
export function mediaMetadata(input={}){
  const provider=input.provider;
  const rights=input.rights;
  if(!Object.hasOwn(MEDIA_PROVIDERS,provider))throw new Error('provider_not_allowlisted');
  if(!Object.hasOwn(MEDIA_RIGHTS,rights))throw new Error('rights_not_allowlisted');
  if(input.rightsConfirmed!==true)throw new Error('rights_confirmation_required');
  const title=safeText(input.title,100),source=safeText(input.source,160),creator=safeText(input.creator,100);
  if(!title)throw new Error('media_title_required');
  if(!creator)throw new Error('artist_or_source_required');
  if(input.prompt!==undefined&&String(input.prompt).length>2000)throw new Error('prompt_too_long');
  return {title,provider,provider_label:MEDIA_PROVIDERS[provider],rights,rights_label:MEDIA_RIGHTS[rights],rights_user_attested:true,artist_or_source:creator,source_reference:source,creative_prompt:safeText(input.prompt??'',1200),provider_verified:false,rights_independently_verified:false};
}
export function mediaRecord(metadata,{sha256,size,width,height,createdAt}={}){
  const m=mediaMetadata(metadata);
  if(typeof sha256!=='string'||!shaPattern.test(sha256))throw new Error('invalid_media_digest');
  if(!Number.isSafeInteger(size)||size<1||size>MEDIA_MAX_PNG_BYTES)throw new Error('invalid_media_size');
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<32||height<32||width>MEDIA_MAX_IMAGE_SIDE||height>MEDIA_MAX_IMAGE_SIDE)throw new Error('invalid_image_dimensions');
  if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt))||new Date(createdAt).toISOString()!==createdAt)throw new Error('invalid_record_time');
  return {schema:'neo.crown.media.v1',id:'NEO-MEDIA-'+sha256.slice(0,24).toUpperCase(),sha256,mime:'image/png',size_bytes:size,width,height,created_at_client_clock:createdAt,...m,storage:'browser_indexeddb_or_memory',image_normalized:true,exif_metadata_retained:false,license_review_complete:false,origin_verification:'user_declared_not_independently_verified',public_release_approved:false};
}
export function imageAttachmentSvg(svg,mediaDataUri){
  if(typeof svg!=='string'||!svg.includes('xmlns="http://www.w3.org/2000/svg"')||!svg.endsWith('</svg>'))throw new Error('invalid_artwork_source');
  if(typeof mediaDataUri!=='string'||mediaDataUri.length>MEDIA_MAX_PNG_BYTES*1.38+100||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(mediaDataUri))throw new Error('unsafe_embedded_media');
  const image=`<defs><clipPath id="neo-media-clip"><rect x="117" y="293" width="486" height="491" rx="17"/></clipPath></defs><rect x="113" y="289" width="494" height="499" rx="21" fill="#080b12" stroke="#d6b572" stroke-width="7"/><image x="117" y="293" width="486" height="491" preserveAspectRatio="xMidYMid slice" clip-path="url(#neo-media-clip)" href="${mediaDataUri}"/><rect x="117" y="741" width="486" height="43" fill="#0c111b" opacity=".91"/><text x="135" y="766" fill="#e7d5ae" font-size="15" font-family="Georgia,serif">ILLUSTRATION · UNVERIFIED SOURCE</text>`;
  return svg.slice(0,-6)+image+'</svg>';
}
export function attachMediaManifest(base,record){
  if(!base||base.schema!=='neo.crown.artwork-studio.v1'||!record||record.schema!=='neo.crown.media.v1'||typeof record.sha256!=='string'||!shaPattern.test(record.sha256)||record.rights_user_attested!==true)throw new Error('invalid_media_manifest');
  return {...base,generator:'procedural_svg_with_embedded_sanitized_png_v1',media_artwork:{media_id:record.id,sha256:record.sha256,mime:'image/png',provider_user_declared:record.provider,creator_or_source_user_declared:record.artist_or_source,rights_user_declared:record.rights,rights_attestation_recorded:true,rights_independently_verified:false,provider_independently_verified:false,original_image_exif_removed:true,faces:['front']},ai_generated:record.provider==='original'?false:null,ai_generation_status:record.provider==='original'?'not_asserted':'user_declared_unverified',ai_provider:record.provider==='original'?null:record.provider,price_embedded:false,ownership_verified:false,public_release_approved:false};
}
