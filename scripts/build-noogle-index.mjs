import fs from 'node:fs/promises';
import { NoogleIndexStore } from '../apps/noogle/index/store.mjs';
import { crawlDomain } from '../apps/noogle/index/domain-crawler.mjs';
import { extractKnowledgeGraph } from '../apps/noogle/index/knowledge-graph.mjs';
import { extractClaimGraph } from '../apps/noogle/index/claim-graph.mjs';

const registry = JSON.parse(await fs.readFile('apps/noogle/index/sources.json', 'utf8'));
const store = new NoogleIndexStore('data/noogle-index.json');
await store.load();
const reports = [];
for (const source of registry.sources.filter(item => item.enabled)) {
  try {
    const report = await crawlDomain(source);
    for (const doc of report.docs) store.upsert(doc);
    reports.push({sourceId:report.sourceId,rootUrl:report.rootUrl,crawled:report.crawled,maxDepth:report.maxDepth,maxPages:report.maxPages,robotsUrl:report.robots.url,robotsDisallowCount:report.robots.disallow.length,errors:report.errors});
    console.log(`Noogle indexed ${report.crawled} page(s) from ${source.name}`);
  } catch (error) {
    reports.push({sourceId:source.id,rootUrl:source.url,crawled:0,errors:[{url:source.url,error:String(error?.message||error)}]});
    console.warn(`Skipped ${source.url}: ${error.message}`);
  }
}
await store.save();
await fs.mkdir('public/api/noogle',{recursive:true});
const snapshot=JSON.parse(await fs.readFile('data/noogle-index.json','utf8'));
const reportPayload={generatedAt:new Date().toISOString(),totalDocuments:snapshot.documents.length,sources:reports};
const graph=extractKnowledgeGraph(snapshot.documents);
const claimGraph=extractClaimGraph(snapshot.documents);
await fs.writeFile('public/api/noogle/index.json',JSON.stringify(snapshot,null,2));
await fs.writeFile('public/api/noogle/crawl-report.json',JSON.stringify(reportPayload,null,2));
await fs.writeFile('public/api/noogle/knowledge-graph.json',JSON.stringify(graph,null,2));
await fs.writeFile('public/api/noogle/claim-graph.json',JSON.stringify(claimGraph,null,2));
console.log(`Noogle native index contains ${snapshot.documents.length} documents, ${graph.nodes.length} graph nodes and ${claimGraph.claims.length} extracted claims`);
