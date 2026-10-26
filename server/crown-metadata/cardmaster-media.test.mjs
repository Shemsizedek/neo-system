import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mediaMetadata,mediaRecord,sniffRasterMime,imageAttachmentSvg,attachMediaManifest,MEDIA_PROVIDERS,MEDIA_RIGHTS} from '../../apps/neoscan/web/cardmaster/studio/media-core.mjs';
import {renderStudioSvg,studioManifest} from '../../apps/neoscan/web/cardmaster/studio/studio-core.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const base={provider:'chatgpt',rights:'created',rightsConfirmed:true,title:'Original concept',creator:'Artwork contributor',source:'Manual export from permitted account',prompt:'A gold crown'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const svgInput={card_id:'NEO-CARD-000001',title:'NOMNI MONETARY INDEX',palette:'aurum',template:'atlas',edition:2,variant:144,revision:3};
const manifest=()=>studioManifest(svgInput,{frontHash:digest(renderStudioSvg(svgInput)),backHash:digest(renderStudioSvg(svgInput,'back')),createdAt:'2026-10-23T03:02:00.000Z'});
const rec=()=>mediaRecord(base,{sha256:digest(png),size:png.byteLength,width:1024,height:1024,createdAt:'2026-10-23T03:04:00.000Z'});
test('only PNG JPEG WebP headers accepted; SVG masquerading as an image rejected',()=>{
 assert.equal(sniffRasterMime(new Uint8Array(png)),'image/png');
 assert.equal(sniffRasterMime(new Uint8Array([255,216,255,220])),'image/jpeg');
 assert.equal(sniffRasterMime(new Uint8Array(Buffer.from('RIFFxxxxWEBP'))),'image/webp');
 assert.throws(()=>sniffRasterMime(new Uint8Array(Buffer.from('<svg onload=alert(1)>'))),/unsupported/);
});
test('media import requires a declared allowed provider and rights attestation',()=>{
 assert.equal(Object.keys(MEDIA_PROVIDERS).length,5);
 assert.equal(Object.keys(MEDIA_RIGHTS).length,3);
 for(const changed of [{rightsConfirmed:false},{provider:'unknown-provider'},{rights:'borrowed'},{title:'   '},{creator:'   '},{prompt:'x'.repeat(2001)}])assert.throws(()=>mediaMetadata({...base,...changed}));
});
test('media records are size/dimension bounded, unapproved and source-claims-unverified',()=>{
 const record=rec();
 assert.match(record.id,/^NEO-MEDIA-[A-F0-9]{24}$/);
 assert.equal(record.sha256,digest(png));
 assert.equal(record.mime,'image/png');
 assert.equal(record.rights_user_attested,true);
 assert.equal(record.rights_independently_verified,false);
 assert.equal(record.provider_verified,false);
 assert.equal(record.public_release_approved,false);
 assert.equal(record.exif_metadata_retained,false);
 for(const input of [{size:5*1024*1024},{width:0},{height:1800},{sha256:'broken'},{createdAt:'never'}]){
  assert.throws(()=>mediaRecord(base,{sha256:digest(png),size:png.byteLength,width:1024,height:1024,createdAt:'2026-10-23T03:04:00.000Z',...input}));
 }
});
test('SVG collage embeds only allowlisted sanitized PNG payload, with visible unverified artwork label',()=>{
 const svg=renderStudioSvg(svgInput),uri='data:image/png;base64,'+png.toString('base64');
 const composed=imageAttachmentSvg(svg,uri);
 assert.match(composed,/data:image\/png;base64,/);
 assert.match(composed,/ILLUSTRATION · UNVERIFIED SOURCE/);
 assert.ok(composed.length>svg.length);
 assert.doesNotMatch(composed,/<script|<foreignObject|onload=/i);
 assert.throws(()=>imageAttachmentSvg(svg,'https://untrusted.example/bad.svg'));
 assert.throws(()=>imageAttachmentSvg(svg,'data:image/svg+xml;base64,PHN2Zz4='));
 assert.throws(()=>imageAttachmentSvg(svg,'data:image/png;base64,AA"><script>alert(1)</script>'));
 assert.throws(()=>imageAttachmentSvg('<svg></svg>',uri));
});
test('photo hybrid provenance distinguishes declared AI source from verified AI generation',()=>{
 const merged=attachMediaManifest(manifest(),rec());
 assert.equal(merged.media_artwork.media_id,rec().id);
 assert.equal(merged.media_artwork.provider_user_declared,'chatgpt');
 assert.equal(merged.media_artwork.provider_independently_verified,false);
 assert.equal(merged.media_artwork.rights_independently_verified,false);
 assert.equal(merged.generator,'procedural_svg_with_embedded_sanitized_png_v1');
 assert.equal(merged.ai_generated,null);
 assert.equal(merged.ai_generation_status,'user_declared_unverified');
 assert.equal(merged.public_release_approved,false);
 assert.equal(merged.issuer_verified,false);
 assert.equal(merged.market_data_verified,false);
 assert.equal(merged.price_embedded,false);
 assert.throws(()=>attachMediaManifest(manifest(),{...rec(),sha256:'invalid'}));
});
test('self-created imported images remain unsigned off-chain art, never ownership proof',()=>{
 const original=mediaRecord({...base,provider:'original'}, {sha256:digest(png),size:png.length,width:1024,height:1024,createdAt:'2026-10-23T03:04:00.000Z'});
 const withArtwork=attachMediaManifest(manifest(),original);
 assert.equal(withArtwork.ai_generated,false);
 assert.equal(withArtwork.ai_provider,null);
 assert.equal(withArtwork.ownership_verified,false);
 assert.match(withArtwork.provenance_notice,/Unsigned off-chain/);
});
