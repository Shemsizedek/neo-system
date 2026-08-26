const NOOGLE_PATH_GRAPH = '../api/noogle/knowledge-graph.json';
let nooglePathGraphCache = null;

async function loadPathGraph() {
  if (nooglePathGraphCache) return nooglePathGraphCache;
  const response = await fetch(NOOGLE_PATH_GRAPH, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Knowledge graph unavailable: ${response.status}`);
  nooglePathGraphCache = await response.json();
  return nooglePathGraphCache;
}

function nodeText(node) {
  return `${node?.label || ''} ${node?.name || ''} ${node?.type || ''}`.toLowerCase();
}

function parseConceptPair(query) {
  const text = String(query).trim();
  const patterns = [
    /^connect\s+(.+?)\s+(?:to|and|with)\s+(.+)$/i,
    /^how\s+(?:is|are)\s+(.+?)\s+connected\s+to\s+(.+)$/i,
    /^(.+?)\s+(?:to|->|→)\s+(.+)$/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return [match[1].trim(), match[2].trim()];
  }
  return null;
}

function matchNodes(graph, concept, limit = 5) {
  const terms = String(concept).toLowerCase().split(/\s+/).filter(term => term.length > 1);
  return (graph.nodes || []).map(node => {
    const text = nodeText(node);
    const exact = text.includes(String(concept).toLowerCase()) ? 3 : 0;
    const score = exact + terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    return { node, score };
  }).filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0, limit);
}

function adjacency(graph) {
  const map = new Map();
  for (const edge of graph.edges || []) {
    if (!map.has(edge.from)) map.set(edge.from, []);
    if (!map.has(edge.to)) map.set(edge.to, []);
    map.get(edge.from).push({ next: edge.to, edge });
    map.get(edge.to).push({ next: edge.from, edge });
  }
  return map;
}

function findPath(graph, starts, ends, maxHops = 4) {
  const map = adjacency(graph);
  const target = new Set(ends);
  const queue = starts.map(id => ({ id, nodes: [id], steps: [] }));
  const visited = new Map(starts.map(id => [id, 0]));
  while (queue.length) {
    const current = queue.shift();
    if (target.has(current.id) && current.steps.length) return current;
    if (current.steps.length >= maxHops) continue;
    for (const hop of map.get(current.id) || []) {
      const depth = current.steps.length + 1;
      if ((visited.get(hop.next) ?? Infinity) <= depth) continue;
      visited.set(hop.next, depth);
      queue.push({ id: hop.next, nodes: [...current.nodes, hop.next], steps: [...current.steps, hop.edge] });
    }
  }
  return null;
}

function renderPath(graph, pair, path) {
  const panel = document.getElementById('relationshipPanel');
  const badge = document.getElementById('relationshipBadge');
  if (!panel || !badge) return;
  if (!path) {
    badge.textContent = 'NO PATH';
    panel.innerHTML = `<p class="muted">No path up to 4 hops was found between “${escapeHtml(pair[0])}” and “${escapeHtml(pair[1])}”.</p>`;
    return;
  }
  const byId = new Map((graph.nodes || []).map(node => [node.id, node]));
  const directTypes = new Set(['PUBLISHED','COMMUNITY_CONTEXT','ATTESTED_IN','MENTIONS','MENTIONS_DATE']);
  const rows = path.steps.map((edge, index) => {
    const from = byId.get(path.nodes[index]);
    const to = byId.get(path.nodes[index + 1]);
    return { from, to, edge, direct: directTypes.has(edge.type) };
  });
  const direct = rows.filter(row => row.direct).length;
  const inferred = rows.length - direct;
  badge.textContent = `${rows.length} HOPS`;
  const summary = `Omnitrix found a ${rows.length}-hop structural path between ${pair[0]} and ${pair[1]}. ${direct} hop${direct === 1 ? '' : 's'} use explicit graph relations and ${inferred} hop${inferred === 1 ? '' : 's'} are path-level inferences. This describes graph connectivity, not proof of causation or universal factual equivalence.`;
  panel.innerHTML = `<div class="path-summary"><strong>Noological synthesis</strong><p>${escapeHtml(summary)}</p></div>${rows.map(row => `<div class="graph-row"><span class="graph-node">${escapeHtml(row.from?.label || row.from?.name || row.from?.id || 'Node')}</span><span class="graph-edge">${escapeHtml(row.edge.type || 'RELATED')}</span><span class="graph-node">${escapeHtml(row.to?.label || row.to?.name || row.to?.id || 'Node')}</span><span class="badge">${row.direct ? 'DIRECT EDGE' : 'INFERRED PATH'}</span></div>`).join('')}`;
}

async function runPathfinding(query) {
  const pair = parseConceptPair(query);
  if (!pair) return false;
  const graph = await loadPathGraph();
  const starts = matchNodes(graph, pair[0]).map(item => item.node.id);
  const ends = matchNodes(graph, pair[1]).map(item => item.node.id);
  const path = starts.length && ends.length ? findPath(graph, starts, ends, 4) : null;
  renderPath(graph, pair, path);
  return true;
}

window.nooglePathfinding = runPathfinding;

document.addEventListener('submit', event => {
  const input = event.target?.querySelector?.('input');
  const pair = input?.value ? parseConceptPair(input.value) : null;
  if (!pair) return;
  event.stopImmediatePropagation();
  runPathfinding(input.value).catch(() => {});
}, true);
