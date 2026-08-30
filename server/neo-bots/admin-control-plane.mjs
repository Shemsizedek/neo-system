export function createNeoBotsAdminControlPlane({runtime,operatorPolicy}={}){
  if(!runtime?.approvals?.requests)throw new Error('NEO Bots runtime with approval queue is required');
  const allowed=typeof operatorPolicy==='function'?operatorPolicy:()=>false;

  function assertOperator(actor){
    if(!allowed(actor))throw new Error('operator authorization required');
  }

  function listPending(actor){
    assertOperator(actor);
    return [...runtime.approvals.requests.values()]
      .filter((request)=>request.status==='pending')
      .map((request)=>sanitizeApproval(request));
  }

  function resolve(actor,{approvalId,decision}){
    assertOperator(actor);
    const resolved=runtime.approvals.resolve(approvalId,{decision,actor:actorLabel(actor)});
    return sanitizeApproval(resolved);
  }

  return {listPending,resolve};
}

export function sanitizeApproval(request){
  if(!request)return null;
  return {
    id:request.id,
    botId:request.botId,
    action:request.action,
    reason:request.reason,
    status:request.status,
    createdAt:request.createdAt,
    resolvedAt:request.resolvedAt,
    resolvedBy:request.resolvedBy,
    payload:sanitizePayload(request.payload),
  };
}

function sanitizePayload(value){
  if(Array.isArray(value))return value.map(sanitizePayload);
  if(!value||typeof value!=='object')return value;
  const output={};
  for(const [key,val] of Object.entries(value)){
    if(/password|secret|token|credential|private.?key|authorization/i.test(key))output[key]='[REDACTED]';
    else output[key]=sanitizePayload(val);
  }
  return output;
}

function actorLabel(actor={}){
  const surface=String(actor.surface||'admin');
  const id=String(actor.id||'unknown');
  return `${surface}:${id}`;
}
