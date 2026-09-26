// Rudwaan Instagram transport adapter v0.1
// Normalizes supported public Instagram interaction events into the Nous bridge.
// Inbound delivery/authentication are injected by the hosting runtime.

import { handleRudwaanMessage } from './rudwaan-nous-bridge.mjs';

export const RUDWAAN_TRANSPORT = Object.freeze({
  id: 'instagram-public-interaction',
  channel: 'instagram',
  supportedInbound: ['comment'],
  supportedOutbound: ['reply_to_comment'],
  dmIngress: 'not_available_in_current_connected_provider',
  aiStudioCharacterHook: 'not_available_in_public_meta_interface',
});

function required(name, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_required`);
  return value.trim();
}

export function normalizeInstagramCommentEvent(event = {}) {
  return {
    schema: 'neo.social.instagram-comment-event.v0.1',
    type: 'comment',
    conversationId: required('mediaId', event.mediaId),
    userId: required('userId', event.userId),
    commentId: required('commentId', event.commentId),
    message: required('message', event.message),
    metadata: {
      mediaId: event.mediaId,
      username: event.username ?? null,
      permalink: event.permalink ?? null,
      receivedAt: event.receivedAt ?? new Date().toISOString(),
    },
  };
}

export async function handleInstagramCommentEvent(event, runtime) {
  if (!runtime || typeof runtime.queryNous !== 'function') throw new Error('nous_runtime_required');
  if (typeof runtime.replyToComment !== 'function') throw new Error('instagram_reply_runtime_required');

  const normalized = normalizeInstagramCommentEvent(event);
  const response = await handleRudwaanMessage({
    conversationId: normalized.conversationId,
    userId: normalized.userId,
    message: normalized.message,
    intent: 'draft_social_reply',
    metadata: normalized.metadata,
  }, runtime);

  if (response.status !== 'ok') return response;

  const replyResult = await runtime.replyToComment({
    commentId: normalized.commentId,
    message: response.reply,
  });

  return {
    schema: 'neo.social.rudwaan-instagram-reply.v0.1',
    status: replyResult?.success === false ? 'failed' : 'replied',
    agentId: 'NIA-013',
    commentId: normalized.commentId,
    reply: response.reply,
    providerReceipt: replyResult ?? null,
    provenance: response.provenance ?? [],
  };
}

export function createRudwaanInstagramHttpHandler({
  verifyRequest,
  runtimeFactory,
} = {}) {
  if (typeof verifyRequest !== 'function') throw new Error('verify_request_required');
  if (typeof runtimeFactory !== 'function') throw new Error('runtime_factory_required');

  return async function rudwaanInstagramHandler(request, env = {}) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        agent: 'NIA-013',
        transport: RUDWAAN_TRANSPORT,
      }), {
        status: 200,
        headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
      });
    }

    if (request.method !== 'POST' || url.pathname !== '/instagram/rudwaan/events') {
      return new Response(JSON.stringify({error: 'Not found'}), {
        status: 404,
        headers: {'content-type': 'application/json; charset=utf-8'},
      });
    }

    const raw = await request.text();
    let verified = false;
    try { verified = await verifyRequest({request, env, raw}); } catch {}
    if (!verified) {
      return new Response(JSON.stringify({error: 'Invalid Instagram transport signature'}), {
        status: 401,
        headers: {'content-type': 'application/json; charset=utf-8'},
      });
    }

    let payload;
    try { payload = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({error: 'Invalid JSON'}), {
        status: 400,
        headers: {'content-type': 'application/json; charset=utf-8'},
      });
    }

    try {
      const result = await handleInstagramCommentEvent(payload, runtimeFactory(env));
      return new Response(JSON.stringify(result), {
        status: result?.status === 'failed' ? 502 : 200,
        headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
      });
    } catch (error) {
      return new Response(JSON.stringify({error: error?.message ?? String(error)}), {
        status: 400,
        headers: {'content-type': 'application/json; charset=utf-8'},
      });
    }
  };
}
