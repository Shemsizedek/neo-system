// NEO Social — Shemsi Comment Assistant v0.1
// Draft-first comment engagement contract. Publishing remains approval-gated.

const SUPPORTED_PLATFORMS = Object.freeze([
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'tiktok',
  'youtube',
]);

const TONES = Object.freeze([
  'professional',
  'warm',
  'concise',
  'educational',
  'witty',
  'measured',
]);

function requiredString(name, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_required`);
  return value.trim();
}

export function normalizeCommentIntake({
  platform,
  accountId,
  commentId,
  authorName = null,
  commentText,
  parentContentId,
  parentContentText = null,
  permalink = null,
  receivedAt = new Date().toISOString(),
  metadata = {},
} = {}) {
  const normalizedPlatform = requiredString('platform', platform).toLowerCase();
  if (!SUPPORTED_PLATFORMS.includes(normalizedPlatform)) {
    throw new Error(`unsupported_platform:${normalizedPlatform}`);
  }

  return {
    schema: 'neo.social.shemsi.comment-intake.v0.1',
    platform: normalizedPlatform,
    accountId: requiredString('accountId', accountId),
    commentId: requiredString('commentId', commentId),
    authorName: typeof authorName === 'string' && authorName.trim() ? authorName.trim() : null,
    commentText: requiredString('commentText', commentText),
    parentContentId: requiredString('parentContentId', parentContentId),
    parentContentText: typeof parentContentText === 'string' && parentContentText.trim()
      ? parentContentText.trim()
      : null,
    permalink,
    receivedAt,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  };
}

export function buildShemsiPrompt(intake, {
  tone = 'professional',
  persona = 'Shemsi',
  maxLength = 600,
  objectives = ['answer directly', 'stay respectful', 'avoid unsupported claims'],
  additionalContext = null,
} = {}) {
  if (!intake?.schema?.startsWith('neo.social.shemsi.comment-intake.')) {
    throw new Error('valid_comment_intake_required');
  }
  if (!TONES.includes(tone)) throw new Error(`unsupported_tone:${tone}`);
  if (!Number.isInteger(maxLength) || maxLength < 40 || maxLength > 5000) {
    throw new Error('max_length_out_of_range');
  }

  return {
    schema: 'neo.social.shemsi.generation-request.v0.1',
    persona: requiredString('persona', persona),
    tone,
    maxLength,
    objectives: Array.isArray(objectives) ? objectives.map(String).filter(Boolean) : [],
    context: {
      platform: intake.platform,
      authorName: intake.authorName,
      commentText: intake.commentText,
      parentContentText: intake.parentContentText,
      additionalContext,
    },
    constraints: {
      draftOnly: true,
      requireHumanApproval: true,
      doNotInventFacts: true,
      doNotExposeSecrets: true,
    },
  };
}

export function createCommentDraft({
  intake,
  responseText,
  model = 'runtime-injected',
  generatedAt = new Date().toISOString(),
  tone = 'professional',
  safety = {},
  maxLength = 600,
} = {}) {
  if (!intake?.schema?.startsWith('neo.social.shemsi.comment-intake.')) throw new Error('valid_comment_intake_required');
  for (const [field,value] of Object.entries({platform:intake.platform,accountId:intake.accountId,commentId:intake.commentId,parentContentId:intake.parentContentId})) requiredString(field,value);
  if (!Number.isInteger(maxLength) || maxLength < 40 || maxLength > 5000) throw new Error('max_length_out_of_range');
  const text = requiredString('responseText', responseText);
  if (text.length > maxLength) throw new Error('response_text_exceeds_max_length');

  return {
    schema: 'neo.social.shemsi.comment-draft.v0.1',
    draftId: `${intake.platform}:${intake.accountId}:${intake.commentId}`,
    platform: intake.platform,
    accountId: intake.accountId,
    commentId: intake.commentId,
    parentContentId: intake.parentContentId,
    responseText: text,
    tone,
    model,
    generatedAt,
    maxLength,
    approval: {
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      approvedResponseText: null,
    },
    safety: {
      reviewed: Boolean(safety.reviewed),
      flags: Array.isArray(safety.flags) ? [...safety.flags] : [],
    },
  };
}

export function approveCommentDraft(draft, {
  approvedBy,
  approvedAt = new Date().toISOString(),
} = {}) {
  if (!draft?.draftId) throw new Error('comment_draft_required');
  if (draft?.approval?.status === 'approved') return draft;
  const approvedResponseText = requiredString('responseText', draft.responseText);

  return {
    ...draft,
    approval: {
      status: 'approved',
      approvedBy: requiredString('approvedBy', approvedBy),
      approvedAt,
      approvedResponseText,
    },
  };
}

export function buildCommentReplyJob(draft) {
  if (!draft?.draftId) throw new Error('comment_draft_required');
  if (draft?.approval?.status !== 'approved') throw new Error('explicit_approval_required');
  for (const [field,value] of Object.entries({platform:draft.platform,accountId:draft.accountId,commentId:draft.commentId,parentContentId:draft.parentContentId,responseText:draft.responseText})) requiredString(field,value);
  if (draft.approval.approvedResponseText !== draft.responseText) throw new Error('approved_content_mismatch');
  if (Number.isInteger(draft.maxLength) && draft.responseText.length > draft.maxLength) throw new Error('response_text_exceeds_max_length');
  const keyPart=value=>encodeURIComponent(requiredString('idempotency_part',value));

  return {
    schema: 'neo.social.shemsi.reply-job.v0.1',
    operation: 'reply_to_comment',
    destination: draft.platform,
    accountId: draft.accountId,
    targetCommentId: draft.commentId,
    parentContentId: draft.parentContentId,
    contentId: draft.draftId,
    sourceVersion: 'shemsi-comment-assistant-v0.1',
    text: draft.responseText,
    approval: {...draft.approval},
    idempotencyKey: `shemsi:${keyPart(draft.platform)}:${keyPart(draft.accountId)}:${keyPart(draft.commentId)}`,
  };
}

export {
  SUPPORTED_PLATFORMS,
  TONES,
};
