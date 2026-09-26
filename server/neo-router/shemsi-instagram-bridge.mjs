import {normalizeInstagramCommentEvent} from '../../src/social/rudwaan-instagram-transport.mjs';
import {makeInboxItem} from './shemsi-store.mjs';

export async function ingestVerifiedInstagramEvent({
  event,
  subjectId,
  accountId,
  store,
  notifyApproval,
}={}){
  if(!store)throw new Error('shemsi_store_required');
  if(typeof subjectId!=='string'||!subjectId.trim())throw new Error('subject_id_required');
  if(typeof accountId!=='string'||!accountId.trim())throw new Error('instagram_account_id_required');

  const normalized=normalizeInstagramCommentEvent(event);
  const item={
    ...makeInboxItem({
      platform:'instagram',
      accountId:accountId.trim(),
      commentId:normalized.commentId,
      parentContentId:normalized.conversationId,
      authorName:normalized.metadata.username||null,
      commentText:normalized.message,
      permalink:normalized.metadata.permalink||null,
      receivedAt:normalized.metadata.receivedAt,
    }),
    authorExternalId:normalized.userId,
    triage:null,
    source:'rudwaan-verified-instagram-transport',
  };

  const created=typeof store.putInboxIfNew==='function'
    ?await store.putInboxIfNew(subjectId,item)
    :(await store.putInbox(subjectId,item),true);

  if(!created)return {status:'duplicate',item:null,notice:null};

  const notice={
    schema:'neo.social.shemsi.approval-notice.v0.1',
    id:`notice:${item.id}`,
    inboxId:item.id,
    platform:'instagram',
    priority:'normal',
    disposition:'review',
    status:'pending',
    createdAt:new Date().toISOString(),
  };
  if(typeof store.saveApprovalNotice==='function')await store.saveApprovalNotice(subjectId,notice);
  if(typeof notifyApproval==='function')await notifyApproval({subjectId,item,notice});

  return {status:'queued',item,notice};
}
