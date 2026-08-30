import { isDiscordOperator, discordActor } from './authorization.js';
import { editDiscordInteraction } from './neo-command.js';

function option(interaction,name){
  return interaction?.data?.options?.find((item)=>item.name===name)?.value;
}

async function controlRequest(env,path,{method='GET',body,actorId,fetchImpl=fetch}={}){
  if(!env.NEO_BOTS_CONTROL_URL)throw new Error('NEO_BOTS_CONTROL_URL is not configured');
  if(!env.NEO_BOTS_CONTROL_TOKEN)throw new Error('NEO_BOTS_CONTROL_TOKEN is not configured');
  const base=new URL(env.NEO_BOTS_CONTROL_URL);
  const target=new URL(path,base);
  if(target.origin!==base.origin)throw new Error('NEO Bots control request must remain same-origin');
  const headers={authorization:`Bearer ${env.NEO_BOTS_CONTROL_TOKEN}`,'content-type':'application/json'};
  if(actorId)headers['x-neo-actor']=String(actorId);
  const response=await fetchImpl(target,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error||`NEO Bots control plane returned ${response.status}`);
  return data;
}

function formatEvidence(evidence={}){
  const identifiers=[
    evidence.cesTransactionId&&`CES TX: ${evidence.cesTransactionId}`,
    evidence.creditVoucher&&`Voucher: ${evidence.creditVoucher}`,
    evidence.tradeSlip&&`Trade Slip: ${evidence.tradeSlip}`,
    evidence.checkNumber&&`Check/e-check: ${evidence.checkNumber}`,
    evidence.transactionNumber&&`Draft TX: ${evidence.transactionNumber}`,
    evidence.hash&&`Hash: ${evidence.hash}`,
  ].filter(Boolean);
  return [
    '**NEO Bots — CES Announcement Evidence Intake**',
    `State: ${evidence.state||'TV-0'}`,
    `Notation route: ${evidence.route||'unrecognized'}`,
    `Notation valid: ${evidence.notationValid===true?'yes':'no'}`,
    evidence.financialInstitutionCes?`CES account: ${evidence.financialInstitutionCes}`:null,
    evidence.seller?`Seller: ${evidence.seller}`:null,
    evidence.buyer?`Buyer: ${evidence.buyer}`:null,
    evidence.amount?`Amount notation: ${evidence.amount}`:null,
    ...identifiers,
    'Execution: read-only. No CES record was created, approved, or modified.'
  ].filter(Boolean).join('\n').slice(0,1900);
}

export async function handleBotsCommand(interaction,env,{fetchImpl=fetch}={}){
  if(!isDiscordOperator(interaction,env))return 'NEO Bots controls require an authorized Discord operator.';
  const action=String(option(interaction,'action')||'pending').toLowerCase();
  const actor=discordActor(interaction);
  if(action==='evidence'){
    const announcement=String(option(interaction,'announcement')||'').trim();
    if(!announcement)return 'announcement is required for the evidence action.';
    const data=await controlRequest(env,'/announcement-evidence',{method:'POST',actorId:actor.id,body:{text:announcement},fetchImpl});
    return formatEvidence(data?.evidence||{});
  }
  if(action==='pending'){
    const data=await controlRequest(env,'/approvals',{actorId:actor.id,fetchImpl});
    const approvals=Array.isArray(data?.approvals)?data.approvals:[];
    if(!approvals.length)return 'NEO Bots: no pending approvals.';
    return ['**NEO Bots Pending Approvals**',...approvals.slice(0,10).map((item)=>`${item.id} | ${item.botId} | ${item.action} | ${item.reason||'governed action'}`)].join('\n');
  }
  if(action!=='approve'&&action!=='reject')return 'Supported actions: evidence, pending, approve, reject.';
  const approvalId=String(option(interaction,'approval_id')||'').trim();
  if(!approvalId)return 'approval_id is required for approve/reject.';
  const decision=action==='approve'?'approved':'rejected';
  const data=await controlRequest(env,`/approvals/${encodeURIComponent(approvalId)}`,{method:'POST',actorId:actor.id,body:{decision,actor:{surface:'discord',id:actor.id,guildId:actor.guildId}},fetchImpl});
  return `NEO Bots approval ${data?.approval?.status||decision}: ${approvalId}. No CES action was executed by this approval command.`;
}

export async function processBotsCommand(interaction,env,{fetchImpl=fetch}={}){
  try{await editDiscordInteraction(interaction,await handleBotsCommand(interaction,env,{fetchImpl}),fetchImpl)}
  catch(err){await editDiscordInteraction(interaction,`NEO Bots control error: ${String(err?.message||err).slice(0,1500)}`,fetchImpl).catch(()=>{})}
}
