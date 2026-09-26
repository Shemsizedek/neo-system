import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeComment,
  buildShemsiPrompt,
  createCommentDraft,
  approveCommentDraft,
  toPublishRequest
} from "./shemsi-comment-assistant.mjs";

test("normalizes supported comments", () => {
  const comment = normalizeComment({ platform: "X", text: "  Good point  " });
  assert.equal(comment.platform, "x");
  assert.equal(comment.text, "Good point");
});

test("builds a draft-only prompt", () => {
  const prompt = buildShemsiPrompt({ platform: "facebook", text: "What does this mean?" });
  assert.match(prompt.system, /draft reply only/i);
  assert.equal(prompt.user, "What does this mean?");
});

test("requires approval before publish conversion", () => {
  const draft = createCommentDraft({
    comment: { platform: "linkedin", id: "c1", text: "Interesting." },
    response: "Thank you for reading."
  });
  assert.equal(draft.status, "draft");
  assert.throws(() => toPublishRequest(draft), /approved/i);

  const approved = approveCommentDraft(draft);
  const request = toPublishRequest(approved);
  assert.equal(request.platform, "linkedin");
  assert.equal(request.text, "Thank you for reading.");
  assert.equal(request.approval.status, "approved");
});
