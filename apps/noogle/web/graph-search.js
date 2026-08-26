const NOOGLE_GRAPH_ENDPOINT = '../api/noogle/knowledge-graph.json';
let noogleGraphCache = null;

async function loadNoogleGraph() {
  if (noogleGraphCache) return noogleGraphCache;
  const response = await fetch(NOOGLE_GRAPH_ENDPOINT, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Knowledge graph unavailable: ${response.status}`);
  noogleGraphCache = await response.json();
  return noogleGraphCache;
}

function graphNodeText(node) {
  return `${node?.label || ''} ${node?.name || ''} ${node?.type || ''}`.toLowerCase();
}

function relationshipMatches(graph, query) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(term => term.length > 1);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const scored = nodes.map(node => ({
    node,
    score: terms.reduce((sum, term) => sum + (graphNodeText(node).includes(term) ? 1 : 0), 0)
  })).filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0, 12);
  const ids = new Set(scored.map(item => item.node.id));
  const relatedEdges = edges.filter(edge => ids.has(edge.from) || ids.has(edge.to)).slice(0, 30);
  const relatedIds = new Set([...ids]);
  relatedEdges.forEach(edge => { relatedIds.add(edge.from); relatedIds.add(edge.to); });
  return {
    nodes: [...relatedIds].map(id => byId.get(id)).filter(Boolean),
    edges: relatedEdges,
    matched: scored.length
  };
}

function renderGraphPanel(result, query) {
  const panel = document.getElementById('relationshipPanel');
  const badge = document.getElementById('relationshipBadge');
  if (!panel || !badge) return;
  badge.textContent = `${result.edges.length} LINKS`;
  if (!result.edges.length) {
    panel.innerHTML = `<p class="muted">No native graph relationships matched “${escapeHtml(query)}”.</p>`;
    return;
  }
  const byId = new Map(result.nodes.map(node => [node.id, node]));
  panel.innerHTML = result.edges.map(edge => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    return `<div class="graph-row"><span class="graph-node">${escapeHtml(from?.label || from?.name || from?.id || edge.from)}</span><span class="graph-edge">${escapeHtml(edge.type || 'RELATED')}</span><span class="graph-node">${escapeHtml(to?.label || to?.name || to?.id || edge.to)}</span></div>`;
  }).join('');
}

async function runGraphSearch(query) {
  try {
    const graph = await loadNoogleGraph();
    const result = relationshipMatches(graph, query);
    renderGraphPanel(result, query);
    return result;
  } catch (error) {
    const panel = document.getElementById('relationshipPanel');
    const badge = document.getElementById('relationshipBadge');
    if (badge) badge.textContent = 'DEGRADED';
    if (panel) panel.innerHTML = `<p class="muted">${escapeHtml(error.message || 'Graph unavailable')}</p>`;
    return { nodes: [], edges: [], matched: 0 };
  }
}

window.noogleGraphSearch = runGraphSearch;

document.addEventListener('submit', event => {
  const input = event.target?.querySelector?.('input');
  if (input?.value) runGraphSearch(input.value);
}, true);
