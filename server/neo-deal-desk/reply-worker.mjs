const normalize=value=>String(value??'').trim().toLowerCase();

function refs(message={}){
  return `${message.inReplyTo||''} ${message.references||''}`.toLowerCase();
}

export function createDealDeskReplyWorker({outbox,outboundService,inboundReader}={}){
  if(!outbox?.list)throw new Error('outbox_store_required');
  if(!outboundService?.recordReply)throw new Error('outbound_service_required');
  if(!inboundReader?.pollUnread)throw new Error('inbound_reader_required');

  async function run({limit=25,actor='NEO_MAIL'}={}){
    if(typeof inboundReader.ready==='function'&&!inboundReader.ready())return {status:'not_configured',provider:inboundReader.provider||'unknown',matched:0,unmatched:0,processed:0};
    const [items,messages]=await Promise.all([outbox.list(),inboundReader.pollUnread({limit})]);
    const sent=items.filter(item=>['sent','replied'].includes(item.status)&&item.delivery?.messageId);
    const results=[];
    for(const message of messages){
      const haystack=refs(message);
      const match=sent.find(item=>haystack.includes(normalize(item.delivery.messageId)));
      if(!match){
        results.push({uid:message.uid,status:'unmatched',from:message.from,subject:message.subject});
        continue;
      }
      const saved=await outboundService.recordReply(match.id,{actor,text:message.text,source:`${inboundReader.provider||'mail'}:imap`});
      if(inboundReader.markSeen)await inboundReader.markSeen(message.uid);
      results.push({uid:message.uid,status:'matched',itemId:match.id,classification:saved.reply?.classification||'unknown'});
    }
    return {
      status:'ok',
      provider:inboundReader.provider||'unknown',
      processed:messages.length,
      matched:results.filter(x=>x.status==='matched').length,
      unmatched:results.filter(x=>x.status==='unmatched').length,
      results
    };
  }

  return Object.freeze({run});
}
