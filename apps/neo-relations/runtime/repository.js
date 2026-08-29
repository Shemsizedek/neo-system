const TERMINAL = new Set(['rejected','executed','cancelled','expired'])

function required(value,name){
  if(value===undefined||value===null||value==='') throw new Error(`${name} is required`)
  return value
}

function sameTenant(actor,tenantId){
  return Array.isArray(actor?.tenantIds) && actor.tenantIds.includes(tenantId)
}

function hasRole(actor,role){
  return Array.isArray(actor?.roles) && actor.roles.includes(role)
}

export class RelationsRepository {
  constructor(db){
    if(!db?.query) throw new Error('db.query adapter is required')
    this.db=db
  }

  async createIntent(input,actor){
    const tenantId=required(input?.tenantId,'tenantId')
    if(!sameTenant(actor,tenantId)) throw new Error('tenant boundary denied')
    if(!(hasRole(actor,'operator')||hasRole(actor,'admin'))) throw new Error('operator role required')
    const intentId=required(input?.intentId,'intentId')
    const action=required(input?.action,'action')
    const resourceType=required(input?.resource?.type,'resource.type')
    const resourceId=input?.resource?.id||null
    const values=[intentId,tenantId,actor.type||'user',required(actor.id,'actor.id'),action,resourceType,resourceId,input.payload||{},input.reason||null,input.correlationId||null,input.expiresAt||null]
    await this.db.query(
      `INSERT INTO relations_write_intents
       (intent_id,tenant_id,actor_type,actor_id,action,resource_type,resource_id,payload,reason,correlation_id,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,
      values
    )
    await this.appendAudit({tenantId,eventType:'relations.intent.created',actor,resourceType,resourceId,intentId,correlationId:input.correlationId,outcome:'pending_approval'})
    return this.getIntent(intentId,actor)
  }

  async getIntent(intentId,actor){
    const {rows}=await this.db.query('SELECT * FROM relations_write_intents WHERE intent_id=$1',[intentId])
    const row=rows[0]
    if(!row) return null
    if(!sameTenant(actor,row.tenant_id)) throw new Error('tenant boundary denied')
    return row
  }

  async listPending(tenantId,actor,limit=20){
    if(!sameTenant(actor,tenantId)) throw new Error('tenant boundary denied')
    if(!(hasRole(actor,'viewer')||hasRole(actor,'operator')||hasRole(actor,'approver')||hasRole(actor,'admin'))) throw new Error('viewer role required')
    const safeLimit=Math.min(Math.max(Number(limit)||20,1),100)
    const {rows}=await this.db.query(
      `SELECT intent_id,tenant_id,actor_type,actor_id,action,resource_type,resource_id,reason,status,created_at,expires_at
       FROM relations_write_intents
       WHERE tenant_id=$1 AND status='pending_approval'
       ORDER BY created_at ASC LIMIT $2`,[tenantId,safeLimit]
    )
    return rows
  }

  async decide(intentId,decision,reason,actor){
    if(!['approve','reject'].includes(decision)) throw new Error('decision must be approve or reject')
    if(!(hasRole(actor,'approver')||hasRole(actor,'admin'))) throw new Error('approver role required')
    const intent=await this.getIntent(intentId,actor)
    if(!intent) throw new Error('intent not found')
    if(TERMINAL.has(intent.status)) throw new Error(`intent is already ${intent.status}`)
    if(intent.status!=='pending_approval') throw new Error(`intent cannot be decided from ${intent.status}`)
    if(String(intent.actor_id)===String(actor.id)) throw new Error('self-approval is forbidden')
    if(actor.type==='ai') throw new Error('AI approval is forbidden')
    if(actor.surface==='discord') throw new Error('Discord approval is disabled in this gate')

    const next=decision==='approve'?'approved':'rejected'
    await this.db.query('BEGIN')
    try{
      const updated=await this.db.query(
        `UPDATE relations_write_intents SET status=$2,version=version+1
         WHERE intent_id=$1 AND status='pending_approval' RETURNING *`,[intentId,next]
      )
      if(updated.rowCount!==1) throw new Error('intent state changed concurrently')
      await this.db.query(
        `INSERT INTO relations_intent_decisions(intent_id,tenant_id,decision,approver_type,approver_id,reason)
         VALUES($1,$2,$3,$4,$5,$6)`,[intentId,intent.tenant_id,decision,actor.type||'user',actor.id,reason||null]
      )
      await this.appendAudit({tenantId:intent.tenant_id,eventType:`relations.intent.${next}`,actor,resourceType:intent.resource_type,resourceId:intent.resource_id,intentId,correlationId:intent.correlation_id,outcome:next},{transaction:true})
      await this.db.query('COMMIT')
      return updated.rows[0]
    }catch(err){
      await this.db.query('ROLLBACK').catch(()=>{})
      throw err
    }
  }

  async ingestRouterEvent(event,actor){
    const tenantId=required(event?.tenantId,'tenantId')
    if(!sameTenant(actor,tenantId)) throw new Error('tenant boundary denied')
    if(actor.type!=='service') throw new Error('service identity required')
    required(event?.eventId,'eventId'); required(event?.eventType,'eventType'); required(event?.source,'source'); required(event?.occurredAt,'occurredAt')
    await this.db.query(
      `INSERT INTO relations_router_events(event_id,event_type,source,tenant_id,actor_ref,correlation_id,occurred_at,payload,source_fingerprint)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.eventId,event.eventType,event.source,tenantId,event.actorRef||null,event.correlationId||null,event.occurredAt,event.payload||{},actor.fingerprint||null]
    )
    await this.appendAudit({tenantId,eventType:event.eventType,actor,resourceType:'router_event',resourceId:event.eventId,correlationId:event.correlationId,outcome:'accepted',metadata:{source:event.source}})
    return {accepted:true,eventId:event.eventId}
  }

  async appendAudit(entry,options={}){
    const actor=entry.actor||{}
    const args=[entry.tenantId,entry.eventType,actor.type||'system',actor.id||'unknown',entry.resourceType||null,entry.resourceId||null,entry.intentId||null,entry.correlationId||null,entry.outcome||'recorded',entry.metadata||{}]
    await this.db.query(
      `INSERT INTO relations_audit_log(tenant_id,event_type,actor_type,actor_id,resource_type,resource_id,intent_id,correlation_id,outcome,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,args
    )
  }
}
