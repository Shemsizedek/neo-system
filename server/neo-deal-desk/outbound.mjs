import { randomUUID } from 'node:crypto';

const clean=(v,max=1000)=>String(v??'').trim().slice(0,max);

export const REPLY_CLASSES=Object.freeze([
  'positive_interest',
  'request_information',
  'referral',
  'not_now',
  'objection_budget',
  'objection_fit',
  'unsubscribe',
  'negative',
  'unknown'
]);

export function classifyReply(text=''){
  const value=clean(text,12000).toLowerCase();
  if(/unsubscribe|remove me|stop email|do not contact|opt.?out/.test(value))return 'unsubscribe';
  if(/interested|let.?s talk|schedule|meeting|call|sounds good|explore|discuss/.test(value))return 'positive_interest';
  if(/send.*information|more info|more information|details|deck|proposal|brief|materials/.test(value))return 'request_information';
  if(/talk to|contact|reach out to|forwarded|looping in|connect you with/.test(value))return 'referral';
  if(/budget|too expensive|cost|price|pricing/.test(value))return 'objection_budget';
  if(/not a fit|doesn.?t fit|not relevant|not applicable/.test(value))return 'objection_fit';
  if(/not now|later|next quarter|next year|timing|circle back/.test(value))return 'not_now';
  if(/no thank|not interested|decline|pass on this/.test(value))return 'negative';
  return 'unknown';
}

export class DealDeskOutboundError extends Error{
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}

export function createInMemoryDealDeskOutbox({now=()=>new Date().toISOString(),id=()=>randomUUID()}={}){
  const items=new Map();
  const events=[];
  const event=(type,item,actor,detail={})=>events.unshift({id:id(),type,itemId:item.id,actor,at:now(),...detail});
  return {
    async ensureSeed(seed=[]){
      for(const input of seed){
        const key=input.id||`outbox:${input.prospectId}`;
        if(items.has(key))continue;
        items.set(key,{...input,id:key,status:input.status||'draft_ready',approvedAt:null,approvedBy:null,sentAt:null,delivery:null,reply:null,createdAt:now(),updatedAt:now()});
      }
    },
    async list(){return [...items.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(x=>structuredClone(x));},
    async get(itemId){const v=items.get(itemId);return v?structuredClone(v):null;},
    async approve(itemId,actor,note=''){
      const current=items.get(itemId);if(!current)throw new DealDeskOutboundError('outbox_item_not_found',404);
      if(current.status==='sent')throw new DealDeskOutboundError('outbox_item_already_sent',409);
      const value={...current,status:'approved_to_send',approvedAt:now(),approvedBy:clean(actor,120),approvalNote:clean(note,500),updatedAt:now()};
      items.set(itemId,value);event('approved',value,actor,{note:clean(note,500)});return structuredClone(value);
    },
    async markSent(itemId,actor,delivery){
      const current=items.get(itemId);if(!current)throw new DealDeskOutboundError('outbox_item_not_found',404);
      const value={...current,status:'sent',sentAt:now(),delivery:delivery||null,updatedAt:now()};
      items.set(itemId,value);event('sent',value,actor,{delivery:delivery||null});return structuredClone(value);
    },
    async recordFailure(itemId,actor,error){
      const current=items.get(itemId);if(!current)throw new DealDeskOutboundError('outbox_item_not_found',404);
      const value={...current,status:'send_failed',lastError:clean(error?.message||error,500),updatedAt:now()};
      items.set(itemId,value);event('send_failed',value,actor,{error:value.lastError});return structuredClone(value);
    },
    async recordReply(itemId,actor,reply={}){
      const current=items.get(itemId);if(!current)throw new DealDeskOutboundError('outbox_item_not_found',404);
      if(current.status!=='sent'&&current.status!=='replied')throw new DealDeskOutboundError('outbox_item_not_sent',409);
      const normalized={
        classification:clean(reply.classification||'unknown',80),
        summary:clean(reply.summary,2000),
        receivedAt:reply.receivedAt||now(),
        source:clean(reply.source||'mail-provider',120)
      };
      const value={...current,status:'replied',reply:normalized,updatedAt:now()};
      items.set(itemId,value);event('replied',value,actor,{classification:normalized.classification});return structuredClone(value);
    },
    async events(limit=50){return structuredClone(events.slice(0,limit));}
  };
}

export function buildWave1Outbox(snapshot={}){
  return (snapshot.outreach||[]).map((brief,index)=>{
    const prepared=snapshot.prospects?.[index]||{};
    const p=prepared.normalized||{};
    const o=prepared.opportunity||{};
    return {
      id:`wave1:${index+1}`,
      campaign:snapshot.campaign||'NEO-DEALDESK-004',
      wave:snapshot.wave||1,
      prospectId:p.organization||brief.prospect||`prospect-${index+1}`,
      prospect:brief.prospect||p.organization,
      recipientName:brief.decisionMaker||p.decisionMakerName||null,
      recipientRole:brief.decisionRole||p.decisionAuthority||null,
      channel:brief.channel||'public_business_contact_route',
      publicContactUrl:brief.publicContactUrl||p.publicContactUrl||null,
      subject:brief.subject,
      body:`NEO Deal Desk commercial introduction for ${brief.prospect||p.organization}. Use the approved proposal and sourced public facts only. Deal class: ${o.dealClass||'unclassified'}. Opening position: ${o.quote?.ask??'terms gated'}.`,
      sourceUrls:brief.sourceUrls||[],
      securitiesRelated:o.dealClass==='equity_investment',
      requiresCompliance:o.dealClass==='equity_investment'||Boolean(o.quote?.approvalRequired),
      status:brief.sendState==='approval_required'?'approval_required':'draft_ready'
    };
  });
}

export function createDealDeskOutboundService({outbox,mailAdapter=null,executionEnabled=false,crmStore=null,now=()=>new Date().toISOString()}={}){
  if(!outbox)throw new Error('outbox_store_required');

  async function seed(snapshot){
    await outbox.ensureSeed(buildWave1Outbox(snapshot));
    return outbox.list();
  }

  async function approve(itemId,{actor,note='',complianceApproved=false}={}){
    const item=await outbox.get(itemId);if(!item)throw new DealDeskOutboundError('outbox_item_not_found',404);
    if(item.requiresCompliance&&!complianceApproved)throw new DealDeskOutboundError('compliance_approval_required',409);
    return outbox.approve(itemId,actor,note);
  }

  async function dispatch(itemId,{actor}={}){
    const item=await outbox.get(itemId);if(!item)throw new DealDeskOutboundError('outbox_item_not_found',404);
    if(item.status!=='approved_to_send')throw new DealDeskOutboundError('outbox_item_not_approved',409);
    if(!executionEnabled)throw new DealDeskOutboundError('outbound_execution_disabled',503);
    if(!mailAdapter?.send)throw new DealDeskOutboundError('mail_adapter_unavailable',503);
    try{
      const delivery=await mailAdapter.send({
        subject:item.subject,
        body:item.body,
        recipientName:item.recipientName,
        recipientRole:item.recipientRole,
        publicContactUrl:item.publicContactUrl,
        metadata:{campaign:item.campaign,prospect:item.prospect,itemId:item.id}
      });
      const sent=await outbox.markSent(itemId,actor,delivery);
      if(crmStore?.create)await crmStore.create({
        type:'activity',
        name:`Outbound sent — ${item.prospect}`,
        status:'active',
        owner:'NIA-013 DEALDESK',
        description:`Commercial outreach sent at ${now()} via ${delivery?.provider||'configured adapter'}; item ${item.id}.`,
        endpoint:item.publicContactUrl,
        tags:'dealdesk,outbound,sent'
      },actor);
      return sent;
    }catch(error){
      await outbox.recordFailure(itemId,actor,error);
      throw error;
    }
  }

  async function recordReply(itemId,{actor,text='',summary='',source='mail-provider'}={}){
    const item=await outbox.get(itemId);if(!item)throw new DealDeskOutboundError('outbox_item_not_found',404);
    const classification=classifyReply(text||summary);
    const saved=await outbox.recordReply(itemId,actor,{
      classification,
      summary:summary||text,
      source,
      receivedAt:now()
    });
    if(crmStore?.create)await crmStore.create({
      type:'activity',
      name:`Reply received — ${item.prospect}`,
      status:'active',
      owner:'NIA-013 DEALDESK',
      description:`Inbound reply classified as ${classification} at ${now()}; item ${item.id}.`,
      endpoint:item.publicContactUrl,
      tags:`dealdesk,outbound,reply,${classification}`
    },actor);
    return saved;
  }

  return Object.freeze({seed,approve,dispatch,recordReply,list:()=>outbox.list(),events:(limit)=>outbox.events(limit),status:()=>({executionEnabled:Boolean(executionEnabled),mailAdapterConfigured:Boolean(mailAdapter?.send)})});
}
