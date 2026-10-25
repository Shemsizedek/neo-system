// NIBIRU-025: NIA-013 private opportunity API policy layer.
// Framework-neutral: attach ONLY after a server-verified NEOpass session
// and a parameterized database adapter; never expose via public/static routes.
const ROLES = Object.freeze({
  read: new Set(['executive-admin','deal-desk-reviewer','deal-desk-analyst']),
  create: new Set(['executive-admin','deal-desk-analyst']),
  review: new Set(['executive-admin','deal-desk-reviewer'])
});
const VALID_STAGES = new Set(['research','due_diligence','underwriting','approval_required','on_hold','archived']);
export class OpportunityAccessError extends Error {
  constructor(code,status=403){ super(code); this.code=code; this.status=status; }
}
function requireAccess(session, action){
  if (!session || session.authenticated !== true || !session.subject)
    throw new OpportunityAccessError('authentication_required',401);
  if (session.neopassStatus !== 'active')
    throw new OpportunityAccessError('active_neopass_required');
  if (!ROLES[action]?.has(session.role))
    throw new OpportunityAccessError('permission_denied');
  return session.subject;
}
function clean(v,n=120){ return typeof v==='string' ? v.trim().slice(0,n) : ''; }
export function createPrivateOpportunityService({storage,audit}={}){
  if (!storage?.insert || !storage?.get || !storage?.list || !storage?.updateReview || !audit?.append)
    throw new Error('private_storage_and_audit_required');
  return Object.freeze({
    async create({session,input}){
      const actor=requireAccess(session,'create');
      const id=clean(input?.id,80), opportunity_name=clean(input?.opportunity_name,180),
        asset_category=clean(input?.asset_category,80), source_project=clean(input?.source_project,80);
      if(!/^[A-Z0-9][A-Z0-9_-]{3,79}$/.test(id)||!opportunity_name||!asset_category||!source_project)
        throw new OpportunityAccessError('invalid_opportunity',400);
      const record={id,opportunity_name,asset_category,source_project,parent_system:'NIA-013',
        stage:'research',confidentiality:'restricted',verification_status:'unverified',
        offering_status:'not_authorized',owner_review_status:'pending',evidence_manifest_ref:null};
      // Server constructs status fields; caller cannot smuggle approved/verified flags.
      const stored=await storage.insert(record);
      await audit.append({action:'opportunity_created',actor,id});
      return stored;
    },
    async get({session,id}){
      requireAccess(session,'read');
      return storage.get(clean(id,80));
    },
    async list({session}){
      requireAccess(session,'read');
      return storage.list();
    },
    async review({session,id,stage}){
      const actor=requireAccess(session,'review');
      if(!VALID_STAGES.has(stage)) throw new OpportunityAccessError('invalid_stage',400);
      // Stage changes alone never approve a securities offer or verify ownership.
      const updated=await storage.updateReview(clean(id,80),{stage});
      await audit.append({action:'opportunity_stage_changed',actor,id:clean(id,80),stage});
      return updated;
    }
  });
}
