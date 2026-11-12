import {createHmac} from 'node:crypto';

// Project 144: strictly private Trello -> Counterpay inbound payment-request bridge.
// No Trello credentials, contact details, keys, outbound communications or spending.
export const FAMILY_OFFICE_BOARD = 'ari:cloud:trello::board/workspace/6440292a287e321c1e592283/6a7e1fdcffb8ff32f47023dc';
const WORKSPACE = '6440292a287e321c1e592283';
const ACTIVE = 'ari:cloud:trello::list/workspace/' + WORKSPACE + '/6a7e1fff8b4402f0c94c4436';
const CLOSING = 'ari:cloud:trello::list/workspace/' + WORKSPACE + '/6a7e2008898704eff86875e5';
const CARD = /^ari:cloud:trello::card\/workspace\/6440292a287e321c1e592283\/[a-f0-9]{24}$/;
const REF = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,79}$/;
const FIELDS = ['decision','approvalId','cardId','channel','purpose','consentConfirmed','legalReview','campaignRef','walletBindingId','amountSats','orderRef','expiresAt'];
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const fail = reason => ({ready:false,reason,paymentCreated:false});

// A card's title, description, comments, contacts, attachments and custom fields
// are untrusted inputs. Only its opaque identity and stage may pass this boundary.
export function projectTrelloOpportunity(card) {
  if (!plain(card) || typeof card.id !== 'string' || !CARD.test(card.id) ||
      card.boardId !== FAMILY_OFFICE_BOARD || typeof card.listId !== 'string' ||
      ![ACTIVE,CLOSING].includes(card.listId) || card.closed !== false) {
    return null;
  }
  return Object.freeze({cardId:card.id,stage:card.listId === CLOSING ? 'CLOSING' : 'ACTIVE_PROCESS'});
}

/**
 * @param {object} args
 * @param {function} args.resolveApproval Trusted server-only mandate resolver.
 * @param {object} args.paymentRequests Existing approved-wallet Bitcoin request service.
 * @param {Buffer} args.hmacKey Server-side private 32-byte or longer mapping key.
 * Caller MUST NOT accept arbitrary "approval" objects supplied by a Trello card/client.
 */
export function createTrelloCounterpayBridge({resolveApproval,paymentRequests,hmacKey,now=()=>new Date()}={}) {
  if (typeof resolveApproval !== 'function' || typeof paymentRequests?.prepare !== 'function' ||
      !Buffer.isBuffer(hmacKey) || hmacKey.length < 32) throw new TypeError('trusted_bridge_dependencies_required');
  function token(label,text) {
    return createHmac('sha256',hmacKey).update('NEO-TRELLO-COUNTERPAY-1\n').update(label).update('\n').update(text).digest('hex');
  }
  async function prepareApprovedRequest({card,approvalRef}={}) {
    const opportunity=projectTrelloOpportunity(card);
    if(!opportunity) return fail('card_not_in_eligible_approved_pipeline_stage');
    if(typeof approvalRef !== 'string' || !REF.test(approvalRef)) return fail('invalid_approval_reference');
    let a;
    try { a=await resolveApproval({cardId:opportunity.cardId,approvalRef}); }
    catch { return fail('trusted_approval_unavailable'); }
    if(!plain(a) || Object.keys(a).length !== FIELDS.length || Object.keys(a).some(k=>!FIELDS.includes(k)) ||
       a.decision !== 'APPROVED' || a.cardId !== opportunity.cardId ||
       !REF.test(a.approvalId??'') || a.approvalId !== approvalRef || !REF.test(a.campaignRef??'') || !REF.test(a.walletBindingId??'') ||
       a.consentConfirmed !== true || a.legalReview !== 'CLEARED' ||
       !['TEMPLE','SALES'].includes(a.channel) ||
       (a.channel==='TEMPLE' ? a.purpose!=='VOLUNTARY_DONATION' : a.purpose!=='COMMERCIAL_SERVICE_SALE')) {
      return fail('verified_approved_commercial_mandate_required');
    }
    // An ordinary sales deal may only become payable in the Closing stage.
    if(a.channel==='SALES' && opportunity.stage!=='CLOSING')return fail('sales_closing_stage_required');
    if(a.channel==='SALES' && (!REF.test(a.orderRef??'') || !Number.isSafeInteger(a.amountSats) || a.amountSats<1000))return fail('approved_fixed_price_required');
    if(a.channel==='TEMPLE' && (a.orderRef!==null || (a.amountSats!==null && (!Number.isSafeInteger(a.amountSats)||a.amountSats<1000))))return fail('invalid_donation_mandate');
    const expiry=Date.parse(a.expiresAt),at=now();
    if(!(at instanceof Date)||!Number.isFinite(at.valueOf()) || !Number.isFinite(expiry) || expiry<=at.valueOf() || expiry-at.valueOf()>30*86400000 || expiry-at.valueOf()<3600000)
      return fail('mandate_expired_or_invalid');
    // Opaque, secret-derived identifiers only. Never include personal contact data.
    const leadRef='tr:'+token('lead',opportunity.cardId).slice(0,56);
    const idempotencyKey='trello_'+token('approval',opportunity.cardId+':'+a.approvalId);
    let request;
    try {
      request=paymentRequests.prepare({
        channel:a.channel,campaignRef:a.campaignRef,leadRef,orderRef:a.channel==='SALES'?a.orderRef:undefined,
        walletBindingId:a.walletBindingId,amountSats:a.amountSats,
        idempotencyKey,expiresHours:Math.min(72,Math.floor((expiry-at.valueOf())/3600000))
      });
    } catch { return fail('verified_wallet_or_payment_request_unavailable'); }
    // This is an internal return value. The public checkout renderer intentionally omits it.
    return {ready:true,state:'REQUEST_PREPARED_INTERNAL',paymentCreated:true,approvalRef,sourceCardRef:leadRef,
      stage:opportunity.stage,request};
  }
  return Object.freeze({prepareApprovedRequest});
}
