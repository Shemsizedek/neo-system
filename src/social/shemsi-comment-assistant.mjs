const SUPPORTED_PLATFORMS = new Set(["facebook","x","linkedin","tiktok","youtube"]);

export function normalizeComment(input = {}) {
  const platform = String(input.platform || "").toLowerCase().trim();
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error("Unsupported platform");
  }

  const text = String(input.text || "").trim();
  if (!text) throw new Error("Comment text is required");

  return {
    id: input.id || null,
    platform,
    text,
    author: input.author ? String(input.author).trim() : null,
    permalink: input.permalink || null,
    parentContent: input.parentContent || null,
    receivedAt: input.receivedAt || new Date().toISOString(),
    metadata: input.metadata || {}
  };
}

export function buildShemsiPrompt(comment, options = {}) {
  const normalized = normalizeComment(comment);
  const tone = options.tone || "measured";
  const persona = options.persona || "Shemsi";
  const objective = options.objective || "respond helpfully and directly";

  return {
    system: [
      "You are the Shemsi Comment Assistant inside NEO Social.",
      "Generate a draft reply only. Never claim the reply was published.",
      "Preserve the author's meaning, avoid fabricated facts, and keep the response suitable for the target platform.",
      "Return plain text suitable for human review."
    ].join(" "),
    context: {
      platform: normalized.platform,
      persona,
      tone,
      objective,
      parentContent: normalized.parentContent,
      commentAuthor: normalized.author
    },
    user: normalized.text
  };
}

export function createCommentDraft(input = {}) {
  const comment = normalizeComment(input.comment);
  const prompt = buildShemsiPrompt(comment, input.options);

  return {
    id: input.id || `shemsi-${Date.now()}`,
    kind: "neo.social.comment.reply",
    status: "draft",
    approvalRequired: true,
    comment,
    prompt,
    response: input.response ? String(input.response).trim() : "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function approveCommentDraft(draft, editedResponse) {
  if (!draft || draft.kind !== "neo.social.comment.reply") {
    throw new Error("Invalid Shemsi draft");
  }
  const response = String(editedResponse ?? draft.response ?? "").trim();
  if (!response) throw new Error("A response is required before approval");

  return {
    ...draft,
    response,
    status: "approved",
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function rejectCommentDraft(draft, reason = "") {
  if (!draft || draft.kind !== "neo.social.comment.reply") {
    throw new Error("Invalid Shemsi draft");
  }
  return {
    ...draft,
    status: "rejected",
    rejectionReason: String(reason || "").trim() || null,
    updatedAt: new Date().toISOString()
  };
}

export function toPublishRequest(draft) {
  if (!draft || draft.status !== "approved") {
    throw new Error("Only approved Shemsi drafts may be converted to publish requests");
  }
  return {
    type: "comment_reply",
    platform: draft.comment.platform,
    targetId: draft.comment.id,
    permalink: draft.comment.permalink,
    text: draft.response,
    source: "shemsi-comment-assistant",
    approval: {
      required: true,
      status: "approved",
      approvedAt: draft.approvedAt
    }
  };
}
