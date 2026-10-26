import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {STUDIO_CARDS,STUDIO_PALETTES,STUDIO_TEMPLATES,studioConfig,renderStudioSvg,studioManifest,studioPrompt} from '../../apps/neoscan/web/cardmaster/studio/studio-core.mjs';
import {CARDMASTER_SEEDS} from './cardmaster-gallery.mjs';
const initial={card_id:'NEO-CARD-000001',title:'NOMNI MONETARY INDEX',palette:'aurum',template:'sovereign',edition:1,variant:144,revision:1};
const digest=s=>createHash('sha256').update(s).digest('hex');
test('studio card identities stay aligned with authoritative Crown registry',()=>{
  assert.equal(STUDIO_CARDS.length,3);
  assert.deepEqual(STUDIO_CARDS.map(c=>c.id),CARDMASTER_SEEDS.map(c=>c.card_id));
  assert.deepEqual(STUDIO_CARDS.map(c=>c.name),CARDMASTER_SEEDS.map(c=>c.title));
});
test('every palette, layout and asset produces real stand-alone artwork on both faces',()=>{
  for(const card of STUDIO_CARDS)for(const palette of Object.keys(STUDIO_PALETTES))for(const template of Object.keys(STUDIO_TEMPLATES)){
    const opts={...initial,card_id:card.id,title:card.name,palette,template};
    for(const face of ['front','back']){
      const svg=renderStudioSvg(opts,face);
      assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert.match(svg,/width="720" height="1040"/);
      assert.match(svg,/UNVERIFIED ASSET PRESENTATION|Not a market quote/);
      assert.ok(svg.length>4000,`${card.id} ${palette} ${template} ${face}`);
      assert.doesNotMatch(svg,/<script|<image|<foreignObject|onload=|href=/i);
    }
  }
});
test('rendered artwork is deterministic for the same revision and varies with design',()=>{
  const a=renderStudioSvg(initial),b=renderStudioSvg(initial);
  assert.equal(a,b);
  assert.notEqual(digest(a),digest(renderStudioSvg({...initial,variant:22})));
  assert.notEqual(digest(a),digest(renderStudioSvg({...initial,palette:'emerald'})));
  assert.notEqual(digest(a),digest(renderStudioSvg({...initial,template:'orbital'})));
  assert.notEqual(digest(a),digest(renderStudioSvg(initial,'back')));
});
test('untrusted headline is escaped in title, text and SVG accessibility attributes',()=>{
  const malicious={...initial,title:'<script>alert("pwn")</script> & vault'};
  for(const face of ['front','back']){
    const svg=renderStudioSvg(malicious,face);
    assert.doesNotMatch(svg,/<script|onerror=|onload=|<foreignObject/i);
    assert.match(svg,/&lt;script&gt;/);
    assert.match(svg,/&amp; vault/);
  }
});
test('rejects unknown assets, palettes, composition, versions and invalid face',()=>{
  for(const input of [{...initial,card_id:'NEO-CARD-999999'}, {...initial,palette:'file:///tmp/surprise'}, {...initial,template:'unknown'}, {...initial,edition:0},{...initial,variant:10000},{...initial,revision:0},{...initial,title:''}]){
    assert.throws(()=>studioConfig(input));
  }
  assert.throws(()=>renderStudioSvg(initial,'exploit'));
});
test('prompt is generative direction, not proof or valuation',()=>{
  const prompt=studioPrompt(initial);
  assert.match(prompt,/Create original artwork only/);
  assert.match(prompt,/Do not add price tickers/);
  assert.doesNotMatch(prompt,/\$144,000,000|24\.5%|14\.4%/);
});
test('manifest is an unsigned versioned SHA-256 record with explicit unverified provenance',()=>{
  const front=renderStudioSvg(initial,'front'),back=renderStudioSvg(initial,'back');
  const manifest=studioManifest(initial,{frontHash:digest(front),backHash:digest(back),createdAt:'2026-10-23T06:00:00.000Z'});
  assert.equal(manifest.version,1);
  assert.equal(manifest.artwork_revision,1);
  assert.equal(manifest.assets.front.sha256,digest(front));
  assert.equal(manifest.assets.back.sha256,digest(back));
  for(const key of ['ai_generated','price_embedded','issuer_verified','backing_verified','market_data_verified','public_release_approved'])assert.equal(manifest[key],false);
  assert.equal(manifest.parent_front_sha256,null);
  assert.equal(manifest.generator,'deterministic_procedural_svg_v1');
});
test('next revision can point to prior local artwork hash without implying on-chain proof',()=>{
  const frontHash=digest(renderStudioSvg(initial));
  const next={...initial,revision:2};
  const manifest=studioManifest(next,{frontHash:digest(renderStudioSvg(next)),backHash:digest(renderStudioSvg(next,'back')),previousFrontHash:frontHash,createdAt:'2026-10-23T06:30:00.000Z'});
  assert.equal(manifest.parent_front_sha256,frontHash);
  assert.equal(manifest.public_release_approved,false);
  assert.match(manifest.provenance_notice,/Unsigned off-chain/);
});
test('incorrect digest, date, and previous revision digest rejected',()=>{
  const config=initial;
  const good='a'.repeat(64);
  assert.throws(()=>studioManifest(config,{frontHash:'bad',backHash:good,createdAt:'2026-10-23T06:00:00.000Z'}));
  assert.throws(()=>studioManifest(config,{frontHash:good,backHash:good,createdAt:'yesterday'}));
  assert.throws(()=>studioManifest(config,{frontHash:good,backHash:good,createdAt:'2026-10-23T06:00:00.000Z',previousFrontHash:'invalid'}));
});
