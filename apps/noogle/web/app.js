const modes = [
  'STANDARD', 'NOOLOGICAL', 'INDIGENOUS', 'HISTORICAL', 'NATURE',
  'SCHOLARLY', 'FACTOLOGY', 'GEOGRAPHIC', 'BITCOIN', 'COUNTERPARTY', 'DEEP SEARCH'
];

const nav = document.getElementById('modeNav');
const activeMode = document.getElementById('activeMode');
const resultCount = document.getElementById('resultCount');
const results = document.getElementById('results');
const knowledgeCard = document.getElementById('knowledgeCard');
let mode = 'STANDARD';

function setMode(nextMode) {
  mode = nextMode;
  activeMode.textContent = nextMode;
  [...nav.children].forEach(button => button.classList.toggle('active', button.dataset.mode === nextMode));
}

modes.forEach(item => {
  const button = document.createElement('button');
  button.className = 'mode-button';
  button.dataset.mode = item;
  button.textContent = item;
  button.addEventListener('click', () => setMode(item));
  nav.appendChild(button);
});
setMode(mode);

const demoSources = [
  {
    title: 'Provenance-first result',
    description: 'Noogle results are designed to show where a claim came from, what kind of evidence supports it, and whether interpretation is being presented as fact.',
    status: 'DOCUMENTED',
    source: 'Noogle Origin specification'
  },
  {
    title: 'Indigenous ontology layer',
    description: 'For Indigenous subjects, Noogle preserves community terminology and distinguishes community knowledge from external academic or colonial naming systems.',
    status: 'COMMUNITY CONTEXT',
    source: 'Indigenous Ontology Protocol'
  },
  {
    title: 'Bitcoin and Counterparty readiness',
    description: 'Omnitrix reserves native interface surfaces for BTC and Counterparty XCP inspection. Transaction execution remains disabled until audited wallet adapters are connected.',
    status: 'PROTOTYPE',
    source: 'Omnitrix architecture'
  }
];

function renderSearch(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  const generated = demoSources.map((item, index) => ({
    ...item,
    title: index === 0 ? `${cleanQuery} — Noogle overview` : item.title,
    description: index === 0
      ? `Prototype result for “${cleanQuery}” in ${mode} mode. Live web indexing is not connected yet; this interface demonstrates the result model and provenance controls.`
      : item.description
  }));

  results.innerHTML = '';
  generated.forEach(item => {
    const article = document.createElement('article');
    article.className = 'result';
    article.innerHTML = `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description)}</p>
      <div class="result-meta">
        <span class="badge">${escapeHtml(item.status)}</span>
        <span class="badge">${escapeHtml(item.source)}</span>
      </div>`;
    results.appendChild(article);
  });

  resultCount.textContent = `${generated.length} results`;
  knowledgeCard.innerHTML = `
    <dl>
      <dt>Subject</dt><dd>${escapeHtml(cleanQuery)}</dd>
      <dt>Mode</dt><dd>${escapeHtml(mode)}</dd>
      <dt>Status</dt><dd>Prototype / not yet live-indexed</dd>
      <dt>Evidence</dt><dd>Not evaluated</dd>
      <dt>Provenance</dt><dd>Required for production results</dd>
      <dt>Next step</dt><dd>Connect Noogle search/index service</dd>
    </dl>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function connectForm(formId, inputId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  form.addEventListener('submit', event => {
    event.preventDefault();
    renderSearch(input.value);
  });
}

connectForm('searchForm', 'queryInput');
connectForm('heroForm', 'heroInput');

document.getElementById('commandButton').addEventListener('click', () => {
  knowledgeCard.innerHTML = `
    <p><strong>Omnitrix Command Intelligence</strong></p>
    <p>This prototype supports local search-mode switching and architecture surfaces. Browser automation, live Noogle indexing, wallets, Counterparty APIs, and miner hardware require explicit service adapters.</p>`;
});

results.innerHTML = '<article class="result"><h4>Noogle is ready for a query.</h4><p>Choose a search mode and enter a concept. The current build demonstrates the interface and evidence/provenance model without fabricating live search data.</p></article>';
