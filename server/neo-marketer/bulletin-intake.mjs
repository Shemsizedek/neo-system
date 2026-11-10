import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}

export function validateBulletinHandoff(payload, at = new Date()) {
  if (!payload || payload.type !== "neo_bulletin_reviewed_publication_v1" ||
      !Number.isSafeInteger(payload.postId) || payload.postId <= 0 ||
      !/^neo-bulletin-[0-9]+-[0-9a-f]{16}$/.test(payload.id || "") ||
      !/^neo-bulletin-[a-z0-9-]{5,100}$/.test(payload.slug || "") ||
      typeof payload.title !== "string" || !payload.title.trim() || payload.title.length > 240 ||
      !/^[a-f0-9]{64}$/.test(payload.contentSha256 || "") ||
      payload.id !== "neo-bulletin-" + payload.postId + "-" + payload.contentSha256.slice(0, 16) ||
      payload.requestedAction !== "queue_reviewed_content_for_marketing" ||
      payload.autoPublishSocial !== false ||
      typeof payload.approvedBy !== "string" || !payload.approvedBy.trim() ||
      !["education", "doctrine", "historical", "rebuttal", "legal"].includes(payload.riskType) ||
      !Array.isArray(payload.sourceUrls) || new Set(payload.sourceUrls).size < 2) {
    throw new Error("invalid_bulletin_payload");
  }
  const url = new URL(payload.url);
  if (url.protocol !== "https:" || url.hostname !== "holytemples.org" ||
      url.username || url.password || url.hash || url.port ||
      !url.pathname.startsWith("/") || !url.pathname.includes("/")) {
    throw new Error("invalid_publication_url");
  }
  for (const value of payload.sourceUrls) {
    const source = new URL(value);
    if (source.protocol !== "https:" || source.username || source.password) throw new Error("unsafe_source_url");
  }
  if (!Number.isFinite(Date.parse(payload.issuedAt)) ||
      Math.abs(new Date(at).getTime() - Date.parse(payload.issuedAt)) > 5 * 60_000) {
    throw new Error("handoff_timestamp_stale");
  }
  if (!Number.isFinite(Date.parse(payload.approvedAt)) ||
      Date.parse(payload.approvedAt) > Date.parse(payload.issuedAt)) throw new Error("invalid_approval_date");
  if (["legal", "rebuttal"].includes(payload.riskType) &&
      (!payload.secondReviewer || payload.secondReviewer === payload.approvedBy)) {
    throw new Error("second_reviewer_required");
  }
  return payload;
}

export function validSignature(body, signature, secret) {
  if (!secret || secret.length < 32 || typeof signature !== "string" ||
      !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(signature.slice(7), "hex"), Buffer.from(expected, "hex"));
}

export async function persistBulletinHandoff(payload, queueDir) {
  if (!queueDir || typeof queueDir !== "string") throw new Error("durable_queue_not_configured");
  await mkdir(queueDir, {recursive: true});
  const record = { ...payload, distributionStatus: "pending_editorial_marketing_review" };
  const path = join(queueDir, payload.id + ".json");
  try {
    await writeFile(path, JSON.stringify(record, null, 2), {flag: "wx", mode: 0o600});
    return {status: "queued", id: payload.id, distribution: "not_sent"};
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const previous = JSON.parse(await readFile(path, "utf8"));
    if (JSON.stringify(previous) !== JSON.stringify(record)) throw new Error("handoff_id_conflict");
    return {status: "already_queued", id: payload.id, distribution: "not_sent"};
  }
}

export async function intakeBulletin(req, res, {
  secret = process.env.NEO_MARKETER_HANDOFF_SECRET,
  queueDir = process.env.NEO_MARKETER_HANDOFF_DIR,
  at = new Date()
} = {}) {
  if (!secret || secret.length < 32 || !queueDir) {
    return json(res, 503, {error: "bulletin_intake_not_configured"});
  }
  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 64 * 1024) return json(res, 413, {error: "handoff_too_large"});
    }
    if (!validSignature(body, req.headers["x-neo-bulletin-signature"], secret)) {
      return json(res, 401, {error: "unauthorized_handoff"});
    }
    const payload = validateBulletinHandoff(JSON.parse(body), at);
    const saved = await persistBulletinHandoff(payload, queueDir);
    return json(res, saved.status === "queued" ? 201 : 200, saved);
  } catch (error) {
    const invalid = /^(invalid_|unsafe_|handoff_timestamp|second_reviewer|handoff_id_conflict)/.test(error.message);
    return json(res, invalid ? 422 : 500, {error: invalid ? error.message : "bulletin_intake_failed"});
  }
}
