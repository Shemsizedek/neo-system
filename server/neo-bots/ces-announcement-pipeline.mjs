import {buildAnnouncementEvidenceFeed} from './ces-announcement-evidence.mjs';

export function createCesAnnouncementEvidencePipeline({fetchAnnouncements,fetchLedgerTransactions,fetchCommunityEvidence=async()=>[]}={}){
  if(typeof fetchAnnouncements!=='function')throw new Error('fetchAnnouncements is required');
  if(typeof fetchLedgerTransactions!=='function')throw new Error('fetchLedgerTransactions is required');
  return async function run({exchangeId='NMNI',account='NMNI0260'}={}){
    const scope=Object.freeze({exchangeId:String(exchangeId).toUpperCase(),account:String(account)});
    const [announcements,ledgerTransactions,communityEvidence]=await Promise.all([
      fetchAnnouncements(scope),fetchLedgerTransactions(scope),fetchCommunityEvidence(scope)
    ]);
    const feed=buildAnnouncementEvidenceFeed(announcements,{ledgerTransactions,communityEvidence});
    return Object.freeze({schema:'neo.ces.primary-evidence-register.v1',scope,readOnly:true,feed,crosswalk:feed.records.map(r=>Object.freeze({announcementId:r.id,route:r.route,state:r.state,cesTransactionId:r.cesTransactionId,transactionNumber:r.transactionNumber,tradeSlip:r.tradeSlip,checkNumber:r.checkNumber,hash:r.hash,ledgerMatched:Boolean(r.ledgerMatch)})),reconciliation:Object.freeze({recognized:feed.records.filter(r=>r.state!=='TV-0').length,exceptions:feed.records.filter(r=>r.state==='TV-0').length,total:feed.records.length})});
  };
}
