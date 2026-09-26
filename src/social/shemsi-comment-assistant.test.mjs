import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCommentIntake,
  buildShemsiPrompt,
  createCommentDraft,
  approveCommentDraft,
  buildCommentReplyJob,
} from './shemsi-comment-assistant.mjs';

test('normalizes a supported comment intake', () => {
  const intake = normalizeCommentIntake({
    platform: 'facebook',
    accountId: 'page-24',
    commentId: 'comment-1',
    commentText: 'What does this mean?',
    parentContentId: 'post-1',
  });

  assert.equal(intake.platform, 'facebook');
  assert.equal(intake.commentText, 'What does this mean?');
});

test('generation request is draft-only and approval-gated', () => {
  const intake = normalizeCommentIntake({
    platform: 'linkedin',
    accountId: 'acct-1',
    commentId: 'comment-2',
    commentText: 'Can you explain this?',
    parentContentId: 'post-2',
  });

  const request = buildShemsiPrompt(intake);
  assert.equal(request.constraints.draftOnly, true);
  assert.equal(request.constraints.requireHumanApproval, true);
});

test('reply job cannot be built before approval', () => {
  const intake = normalizeCommentIntake({
    platform: 'x',
    accountId: 'acct-x',
    commentId: 'reply-7',
    commentText: 'Interesting.',
    parentContentId: 'post-x',
  });

  const draft = createCommentDraft({
    intake,
    responseText: 'Thank you. Here is the context.',
  });

  assert.throws(() => buildCommentReplyJob(draft), /explicit_approval_required/);
});

test('approved draft becomes an idempotent reply job', () => {
  const intake = normalizeCommentIntake({
    platform: 'youtube',
    accountId: 'channel-1',
    commentId: 'comment-9',
    commentText: 'Where can I learn more?',
    parentContentId: 'video-4',
  });

  const draft = createCommentDraft({
    intake,
    responseText: 'Start with the linked overview and work forward from there.',
  });

  const approved = approveCommentDraft(draft, {approvedBy: 'operator'});
  const job = buildCommentReplyJob(approved);

  assert.equal(job.operation, 'reply_to_comment');
  assert.equal(job.destination, 'youtube');
  assert.match(job.idempotencyKey, /^shemsi:youtube:/);
});
