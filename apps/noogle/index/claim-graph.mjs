const SOURCE_WEIGHT = { primary: 1, onchain: .95, scholarly: .85, archive: .8, community: .8, reference: .65, other: .45 };

function sentences(text='') {
  return String(text).split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=40&&s.length<=420).slice(0,12);
}
function normalizeClaim(text='') {
  return String(text).toLowerCase().replace(/\b(not|never|no)\b/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,14).join(' ');
}
function stance(text='') { return /\b(not|never|no evidence|does not|did not|cannot|isn't|aren't)\b/i.test(text) ? 'contradicts' : 'supports'; }

export function extractClaimGraph(documents=[]) {
  const claims=[]; const evidence=[]; const groups=new Map();
  for (const doc of documents) {
    for (const sentence of sentences(doc.summary || '')) {
      const key=normalizeClaim(sentence); if(!key) continue;
      const id=`claim:${key.replace(/\s+/g,'-').slice(0,80)}`;
      if(!groups.has(id)) groups.set(id,{id,text:sentence,key,support:[],contradict:[]});
      const item={documentId:doc.id,url:doc.canonicalUrl||doc.url,publisher:doc.publisher||'',sourceClass:doc.sourceClass||'other',evidenceState:doc.evidenceState||'unverified',weight:SOURCE_WEIGHT[doc.sourceClass]??.45};
      const bucket=stance(sentence)==='contradicts'?'contradict':'support'; groups.get(id)[bucket].push(item);
    }
  }
  for (const group of groups.values()) {
    const supporting=group.support.reduce((s,x)=>s+x.weight,0);
    const opposing=group.contradict.reduce((s,x)=>s+x.weight,0);
    const diversity=new Set([...group.support,...group.contradict].map(x=>x.publisher||x.url)).size;
    const confidence=Math.max(0,Math.min(1,(supporting/(supporting+opposing+1))*.75+Math.min(diversity/4,.25)));
    claims.push({id:group.id,text:group.text,confidence:Number(confidence.toFixed(3)),supportCount:group.support.length,contradictCount:group.contradict.length,sourceDiversity:diversity,status:opposing>supporting?'disputed':opposing>0?'contested':'supported-by-index'});
    for (const x of group.support) evidence.push({claimId:group.id,stance:'support',...x});
    for (const x of group.contradict) evidence.push({claimId:group.id,stance:'contradict',...x});
  }
  return {version:1,generatedAt:new Date().toISOString(),method:'deterministic summary-sentence extraction; confidence is evidence-weight metadata, not truth probability',claims,evidence};
}
