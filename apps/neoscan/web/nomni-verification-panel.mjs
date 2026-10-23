// NOMNI-SEO-022 — Retail verification panel. No fetch, trading, signing, or valuation.
import {projectNomniMarketStatus} from '../nomni-market-status.mjs';
const fields=[['Blockchain records','blockchain'],['Crown Chain evidence','crown_chain'],['Asset backing','reserves'],['Legal ownership','legal_rights'],['Market valuation','valuation'],['NOMNI index','index']];
export function createNomniVerificationPanel(documentRef,{counterpartyObservation=null,crownSummary=null}={}){
 if(!documentRef?.createElement)throw new TypeError('dom_required');
 const snapshot=projectNomniMarketStatus({counterpartyObservation,crownSummary});
 const section=documentRef.createElement('section');section.className='nomni-verification-panel';section.setAttribute('aria-label','NOMNI financial verification');
 const title=documentRef.createElement('h2');title.textContent='NOMNI verification';section.append(title);
 const subtitle=documentRef.createElement('p');subtitle.textContent='Bitcoin / Counterparty and Crown Chain evidence are displayed separately from financial claims.';section.append(subtitle);
 for(const [label,key] of fields){
  const row=documentRef.createElement('div');row.className='nomni-verification-row';
  const heading=documentRef.createElement('strong');heading.textContent=label;
  const status=documentRef.createElement('span');status.textContent=snapshot.labels[key];
  row.append(heading,status);section.append(row);
 }
 const disclosure=documentRef.createElement('p');disclosure.className='nomni-verification-disclosure';disclosure.textContent=snapshot.disclaimer;section.append(disclosure);
 return section;
}
