// NEO Sync scheduled crawler: provenance-preserving snapshots + revision queue.
// Uses only Node built-ins so it can run in GitHub Actions without extra packages.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SOURCES = [
  { id: 'SRC-HOLY-TABLETS-WEB', title: 'The Holy Tablets by Dr. Malachi Z. York', url: 'https://holytablets.nuwaubianfacts.com/', mode: 'PRIMARY_SACRED', maxPages: 30 },
  { id: 'SRC-WORLD-TEMPLE-WEB', title: 'World Temple — Omniversal Church', url: 'https://holytemples.school.blog/', mode: 'PRIMARY_INSTITUTIONAL', maxPages: 40 }
]

const STATE_PATH = 'data/neo-sync/crawler-state.json'
const QUEUE_PATH = 'data/neo-sync/review-queue.json'
const REPORT_PATH = 'data/neo-sync/latest-report.json'
const USER_AGENT = 'NEO-Sync-Crawler/1.0 (+provenance-preserving research)'

const hash = value => createHash('sha256').update(value).digest('hex')
const strip = html => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const titleOf = html => (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? 'Untitled').replace(/\s+/g, ' ').trim()
const linksOf = (html, base) => [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
  .map(m => { try { return new URL(m[1], base).href } catch { return null } })
  .filter(Boolean)

function qualityFor(snapshot) {
  const dims = {
    provenance: snapshot.url && snapshot.hash ? 9 : 2,
    truthfulness: 8,
    soundRightReason: 7,
    coherence: 7,
    ethics: 9,
    reciprocity: 7,
    natureAlignment: 6,
    craftsmanship: snapshot.title !== 'Untitled' ? 8 : 5,
    consequence: 8
  }
  const values = Object.values(dims)
  const average = values.reduce((a,b) => a+b, 0) / values.length
  return {
    dimensions: dims,
    average,
    potency: average >= 7.5 ? '9_ETHER_COHERENT' : average <= 4.5 ? '6_ETHER_CONTRACTIVE' : 'DYNAMIC_BALANCE',
    gate: Math.min(...values) < 4 ? 'HOLD' : average >= 7 ? 'PASS' : 'REVIEW',
    note: 'Heuristic artifact-quality assessment only; not a score of persons, identities or protected characteristics.'
  }
}

async function fetchPage(url) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('text/html')) return null
  const html = await response.text()
  const text = strip(html)
  return {
    url: response.url,
    title: titleOf(html),
    hash: hash(text),
    bytes: Buffer.byteLength(html),
    excerpt: text.slice(0, 420),
    headings: [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].slice(0, 30).map(m => strip(m[1])),
    links: linksOf(html, response.url)
  }
}

async function crawlSource(source) {
  const root = new URL(source.url)
  const queue = [root.href]
  const seen = new Set()
  const pages = []
  const errors = []
  while (queue.length && pages.length < source.maxPages) {
    const url = queue.shift()
    if (!url || seen.has(url)) continue
    seen.add(url)
    try {
      const page = await fetchPage(url)
      if (!page) continue
      pages.push({ ...page, quality: qualityFor(page) })
      for (const link of page.links) {
        const parsed = new URL(link)
        if (parsed.origin === root.origin && !seen.has(parsed.href) && !/\.(pdf|jpg|jpeg|png|gif|zip)$/i.test(parsed.pathname)) queue.push(parsed.href)
      }
    } catch (error) {
      errors.push({ url, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return { sourceId: source.id, title: source.title, mode: source.mode, rootUrl: source.url, crawledAt: new Date().toISOString(), pages, errors }
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return fallback }
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n')
}

const previous = await readJson(STATE_PATH, { sources: {} })
const runs = []
const review = []
const nextState = { version: 1, updatedAt: new Date().toISOString(), sources: {} }

for (const source of SOURCES) {
  const run = await crawlSource(source)
  runs.push(run)
  const priorPages = new Map((previous.sources?.[source.id]?.pages ?? []).map(p => [p.url, p]))
  const currentPages = run.pages.map(page => ({ url: page.url, title: page.title, hash: page.hash, bytes: page.bytes, excerpt: page.excerpt, headings: page.headings, quality: page.quality }))
  nextState.sources[source.id] = { title: source.title, rootUrl: source.url, mode: source.mode, pages: currentPages }

  for (const page of currentPages) {
    const before = priorPages.get(page.url)
    if (!before) review.push({ type: 'NEW_PAGE', sourceId: source.id, url: page.url, title: page.title, currentHash: page.hash, quality: page.quality, decision: 'CANDIDATE' })
    else if (before.hash !== page.hash) review.push({ type: 'REVISION', sourceId: source.id, url: page.url, title: page.title, previousHash: before.hash, currentHash: page.hash, previousExcerpt: before.excerpt, currentExcerpt: page.excerpt, quality: page.quality, decision: 'REVIEW_REQUIRED' })
    priorPages.delete(page.url)
  }
  for (const removed of priorPages.values()) review.push({ type: 'REMOVED_OR_UNREACHABLE', sourceId: source.id, url: removed.url, title: removed.title, previousHash: removed.hash, decision: 'REVIEW_REQUIRED' })
}

const report = {
  generatedAt: new Date().toISOString(),
  architecture: 'crawler -> hash -> revision diff -> candidate graph relations -> 9-Ethereal quality gate -> Neopedia draft/review queue',
  sources: runs.map(r => ({ sourceId: r.sourceId, title: r.title, rootUrl: r.rootUrl, pages: r.pages.length, errors: r.errors })),
  changes: review.length,
  reviewQueuePath: QUEUE_PATH,
  statePath: STATE_PATH
}

await writeJson(STATE_PATH, nextState)
await writeJson(QUEUE_PATH, { generatedAt: report.generatedAt, items: review })
await writeJson(REPORT_PATH, report)
console.log(JSON.stringify(report, null, 2))
