import crypto from 'node:crypto';

const ENTITY_PATTERNS = [
  { type: 'bitcoin', re: /\bBitcoin\b/gi },
  { type: 'counterparty', re: /\bCounterparty(?:\s+XCP)?\b/gi },
  { type: 'organization', re: /\b(?:OpenAlex|Internet Archive|mempool\.space|Noogle|Omnitrix)\b/gi },
  { type: 'place', re: /\b(?:United States|Africa|Asia|Europe|North America|South America|Australia)\b/gi }
];

export function extractKnowledgeGraph(documents = []) {
  const nodes = new Map();
  const edges = [];
  const addNode = (label, type, extra = {}) => {
    const key = `${type}:${label.toLowerCase()}`;
    if (!nodes.has(key)) nodes.set(key, { id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 20), label, type, aliases: [], ...extra });
    return nodes.get(key);
  };
  const addEdge=(from,to,type,extra={})=>edges.push({from,to,type,relation:type,...extra});

  for (const doc of documents) {
    const sourceNode = addNode(doc.publisher || new URL(doc.url).hostname, 'source', { url: doc.url });
    const documentNode = addNode(doc.title || doc.url, 'document', { url: doc.canonicalUrl || doc.url, evidenceState: doc.evidenceState, sourceClass: doc.sourceClass, contentHash: doc.contentHash });
    addEdge(sourceNode.id,documentNode.id,'PUBLISHED',{evidenceState:doc.evidenceState,sourceClass:doc.sourceClass});

    for (const community of doc.communities || []) {
      const communityNode = addNode(community, 'community');
      addEdge(communityNode.id,documentNode.id,'COMMUNITY_CONTEXT',{attributed:true});
    }
    for (const term of doc.communityTerms || []) {
      const termNode = addNode(term.term, 'term', { aliases: term.aliases || [], attribution: term.attribution || null });
      addEdge(termNode.id,documentNode.id,'ATTESTED_IN',{attribution:term.attribution||null});
    }

    const text = `${doc.title || ''} ${doc.summary || ''}`;
    for (const pattern of ENTITY_PATTERNS) {
      const labels = [...new Set([...text.matchAll(pattern.re)].map(match => match[0]))];
      for (const label of labels) addEdge(documentNode.id,addNode(label, pattern.type).id,'MENTIONS',{evidenceState:doc.evidenceState});
    }
    const years = [...new Set((text.match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/g) || []))];
    for (const year of years) addEdge(documentNode.id,addNode(year, 'date').id,'MENTIONS_DATE',{evidenceState:doc.evidenceState});
  }

  return { version: 2, generatedAt: new Date().toISOString(), nodes: [...nodes.values()], edges: dedupeEdges(edges) };
}

function dedupeEdges(edges) {
  const seen = new Set();
  return edges.filter(edge => { const key = `${edge.from}:${edge.type}:${edge.to}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
