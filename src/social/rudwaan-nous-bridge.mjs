// RUDWAAN -> Nous OS public bridge v0.1
// Pure policy/routing layer. Transport and model execution are injected by runtime.

export const RUDWAAN_AGENT_ID = 'NIA-013';

export const PUBLIC_INTENTS = Object.freeze([
  'explain_public_knowledge',
  'navigate_public_service',
  'draft_social_reply',
  'draft_social_content',
  'route_contact_request',
  'route_enrollment_interest',
  'route_store_interest',
  'route_bulletin_interest',
  'route_neotherapy_interest',
  'route_noology_interest',
]);

export const PRIVILEGED_INTENTS = Object.freeze([
  'publish_content',
  'change_account',
  'modify_credentials',
  'deploy_system',
  'canonical_write',
  'financial_action',
  'private_record_access',
  'legal_case_record_access',
  'destructive_action',
]);

function required(name, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_required`);
  return value.trim();
}

export function classifyRudwaanIntent(intent) {
  const normalized = required('intent', intent).toLowerCase();
  if (PUBLIC_INTENTS.includes(normalized)) return {intent: normalized, class: 'public'};
  if (PRIVILEGED_INTENTS.includes(normalized)) return {intent: normalized, class: 'privileged'};
  return {intent: normalized, class: 'unknown'};
}

export function buildRudwaanEnvelope({
  conversationId,
  userId,
  message,
  intent = 'explain_public_knowledge',
  metadata = {},
} = {}) {
  const classification = classifyRudwaanIntent(intent);
  return {
    schema: 'neo.social.rudwaan-envelope.v0.1',
    agentId: RUDWAAN_AGENT_ID,
    channel: 'instagram',
    conversationId: required('conversationId', conversationId),
    userId: required('userId', userId),
    message: required('message', message),
    intent: classification.intent,
    intentClass: classification.class,
    metadata,
    controls: {
      publicOnly: true,
      privateRecords: false,
      secrets: false,
      financialExecution: false,
      accountChanges: false,
      canonicalWrite: false,
      publication: false,
    },
  };
}

export async function handleRudwaanMessage(input, runtime) {
  if (!runtime || typeof runtime.queryNous !== 'function') throw new Error('nous_runtime_required');

  const envelope = buildRudwaanEnvelope(input);

  if (envelope.intentClass !== 'public') {
    return {
      schema: 'neo.social.rudwaan-response.v0.1',
      agentId: RUDWAAN_AGENT_ID,
      status: 'handoff_required',
      reason: envelope.intentClass === 'privileged' ? 'privileged_intent' : 'unknown_intent',
      intent: envelope.intent,
      handoff: 'NEOsync',
      reply: 'That request requires a protected NEOsync workflow and cannot be executed from the public Instagram interface.',
    };
  }

  const result = await runtime.queryNous(envelope);
  if (!result || typeof result.reply !== 'string' || !result.reply.trim()) {
    throw new Error('nous_reply_required');
  }

  return {
    schema: 'neo.social.rudwaan-response.v0.1',
    agentId: RUDWAAN_AGENT_ID,
    status: 'ok',
    intent: envelope.intent,
    reply: result.reply.trim(),
    provenance: result.provenance ?? [],
    actions: [],
  };
}
