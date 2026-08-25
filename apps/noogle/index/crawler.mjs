import crypto from 'node:crypto';
import { rankDocument } from './ranker.mjs';

const USER_AGENT = 'NoogleBot/0.1 (+https://shemsizedek.github.io/neo-system/noogle/)';

export function normalizeUrl(input) {
  const url = new URL(input);
  url.hash = '';
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only public HTTP(S) URLs are supported');
  return url.toString();
}

export async function crawlPublicSource(input, options = {}) {
  const url = normalizeUrl(input);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': USER_AGENT, 'accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
    signal: AbortSignal.timeout(options.timeoutMs || 12000)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType)) throw new Error(`Unsupported content type: ${contentType}`);

  const text = await response.text();
  const title = extractTitle(text) || new URL(url).hostname;
  const summary = extractSummary(text);
  const canonicalUrl = extractCanonical(text, url) || url;
  const contentHash = crypto.createHash('sha256').update(text).digest('hex');
  const communitySpecific = Boolean(options.communitySpecific);

  const rank = rankDocument({
    relevance: options.relevance ?? 0.5,
    provenance: 1,
    communityAuthority: options.communityAuthority ?? 0,
    recency: options.recency ?? 0.5,
    diversity: options.diversity ?? 0.5,
    communitySpecific
  });

  return {
    id: crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 24),
    title,
    url,
    canonicalUrl,
    summary,
    language: options.language || 'und',
    sourceClass: options.sourceClass || 'other',
    evidenceState: options.evidenceState || 'unverified',
    publisher: options.publisher || new URL(canonicalUrl).hostname,
    authors: options.authors || [],
    retrievedAt: new Date().toISOString(),
    publishedAt: options.publishedAt || null,
    contentHash,
    communities: options.communities || [],
    communityTerms: options.communityTerms || [],
    rank
  };
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decode(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 240) : null;
}

function extractSummary(html) {
  const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  if (meta) return decode(meta[1]).slice(0, 800);
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 800);
}

function extractCanonical(html, base) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!match) return null;
  try { return normalizeUrl(new URL(match[1], base).toString()); } catch { return null; }
}

function decode(value) {
  return String(value)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
