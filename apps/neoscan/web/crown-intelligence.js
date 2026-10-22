(()=>{'use strict';
const classes=['BOND','HOUSING','SHARE','INDEX','FUND'];
const names={BOND:'Bonds',HOUSING:'Housing',SHARE:'Shares',INDEX:'Indices',FUND:'Funds'};
const labels={BOND:['Face value','Coupon / yield','Maturity','Credit evidence'],HOUSING:['NOI','Occupancy','Cap rate','Reporting period'],SHARE:['Outstanding shares','Price / return','Voting rights','Report date'],INDEX:['Index level','Constituents','Rebalance','Methodology'],FUND:['NAV','Holdings','Valuation','Report date']};
const tabs=document.querySelector('#categories'),summary=document.querySelector('#summary'),proof=document.querySelector('#proof'),notice=document.querySelector('#notice');
let records=[];
function cell(parent,tag,label,value){const node=document.createElement(tag);if(label)node.setAttribute('aria-label',label);node.textContent=value;parent.append(node)}
function show(category){tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.class===category)));
summary.replaceChildren();proof.replaceChildren();
const record=records.find(r=>r?.terms?.class===category&&r.schema==='neo.crown.market.v1');
for(const metric of labels[category]){
const panel=document.createElement('article');panel.className='panel';
cell(panel,'div','',metric);const m=record?.measurements?.find(x=>x.name===metric&&x.sourceRefs?.length&&x.asOf&&x.unit);
const v=m?m.value+' '+m.unit:'Unavailable';const el=document.createElement('div');el.className='value';el.textContent=v;panel.append(el);
if(m){const dt=document.createElement('p');dt.className='small';dt.textContent='As of '+m.asOf+' · '+m.state;panel.append(dt)}
summary.append(panel)}
for(const [label,value] of [['Bitcoin block',record?.bitcoinAnchor?.blockHeight??'Not independently verified'],['Counterparty asset',record?.counterparty?.asset??'Unavailable'],['Evidence state',record?.evidenceState??'Unavailable'],['Sources',record?.provenanceRefs?.length??0]]){
cell(proof,'dt','',label);cell(proof,'dd','',String(value))}
notice.textContent=record?'Measurements are source-attributed observations, not guarantees of asset value, ownership, or future returns.':'No verified financial measurements loaded. NEO Scan will never invent prices, yields, ratings or performance figures.'
}
classes.forEach((c,i)=>{const btn=document.createElement('button');btn.type='button';btn.dataset.class=c;btn.setAttribute('aria-pressed',String(i===0));btn.textContent=names[c];btn.addEventListener('click',()=>show(c));tabs.append(btn)});
const source=window.NEO_CROWN_MARKET_RECORDS;
if(Array.isArray(source))records=source.filter(r=>r&&r.schema==='neo.crown.market.v1');
show('BOND');
})();