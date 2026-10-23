import {createDraft,parseDrafts,MAX_DRAFTS,STORAGE_KEY} from './core.js';

const $ = id => document.getElementById(id);
const views = {overview:'Overview',plans:'Build a plan',contracts:'My contracts',connections:'Connections'};
let drafts = [];
let storageHealthy = true;
let toastTimer;

function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; },5000);
}
function node(tag,text,className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}
function persist(next) {
  if (!storageHealthy) throw new Error('Existing local storage could not be read. Export or repair it before saving new drafts.');
  localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
  drafts = next;
  renderDrafts();
}
function exportDraft(draft) {
  $('export-value').value = JSON.stringify(draft,null,2);
  $('export-dialog').showModal();
  $('export-value').focus();
  $('export-value').select();
}
function renderDrafts() {
  $('draft-count').textContent = String(drafts.length);
  $('overview-drafts').textContent = String(drafts.length);
  const container = $('draft-list');
  container.replaceChildren();
  if (!drafts.length) {
    const empty = node('article',undefined,'panel empty');
    empty.append(node('span','\u25a1','empty-icon'),node('h2','Your first plan starts here.'),node('p','No local drafts yet. Choose a hashrate and duration without committing funds.'));
    const link = node('a','Build a mining plan \u2197','button primary');
    link.href = '#plans';
    empty.append(link);container.append(empty);return;
  }
  for (const draft of drafts) {
    const card = node('article',undefined,'panel draft-card');
    card.append(node('span','LOCAL DRAFT \u00b7 NOT PURCHASED','quiet-tag'),node('h2',`${draft.hashrateTh.toLocaleString()} TH/s`),node('p',`${draft.termDays} days \u00b7 ${draft.requestedRail} requested`));
    if (draft.assetReference) card.append(node('p',`Unverified asset reference: ${draft.assetReference}`));
    card.append(node('code',draft.id),node('p',`Saved ${new Date(draft.createdAt).toLocaleString()}`));
    const actions = node('div',undefined,'draft-actions');
    const exportButton = node('button','Export plan');
    exportButton.type = 'button';exportButton.addEventListener('click',() => exportDraft(draft));
    const deleteButton = node('button','Delete draft');
    deleteButton.type = 'button';deleteButton.addEventListener('click',() => {
      if (!window.confirm('Delete this local draft? This does not cancel any external mining contract.')) return;
      try { persist(drafts.filter(row => row.id !== draft.id));toast('Local draft deleted.'); }
      catch { toast('Unable to update local storage. No change was saved.'); }
    });
    actions.append(exportButton,deleteButton);card.append(actions);container.append(card);
  }
}
function route() {
  const requested = location.hash.slice(1);
  const active = Object.hasOwn(views,requested) ? requested : 'overview';
  for (const name of Object.keys(views)) $(`view-${name}`).hidden = name !== active;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const selected = link.dataset.nav === active;
    link.classList.toggle('active',selected);
    if (selected) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  $('page-title').textContent = views[active];
  document.title = `${views[active]} | NEO Cloud Miner`;
  window.scrollTo(0,0);
}
function updateSummary() {
  const amount = Number($('hashrate').value);
  $('summary-hash').textContent = Number.isFinite(amount) && amount > 0 ? amount.toLocaleString() : '\u2014';
  $('summary-term').textContent = `${$('term').value} days`;
  $('summary-rail').textContent = $('rail').value;
  document.querySelectorAll('[data-hashrate]').forEach(button => button.classList.toggle('selected',Number(button.dataset.hashrate) === amount));
}
try { drafts = parseDrafts(localStorage.getItem(STORAGE_KEY)); }
catch { storageHealthy = false;toast('Local drafts could not be read. Existing storage was preserved.'); }

$('plan-form').addEventListener('submit',event => {
  event.preventDefault();$('plan-error').textContent = '';
  try {
    if (!$('acknowledge').checked) throw new Error('Please acknowledge that this is a draft.');
    if (drafts.length >= MAX_DRAFTS) throw new Error('Export or delete an existing draft before adding more than 25.');
    const draft = createDraft({hashrateTh:$('hashrate').value,termDays:$('term').value,requestedRail:$('rail').value,assetReference:$('asset').value},{id:`PLAN-${crypto.randomUUID()}`});
    persist([draft,...drafts]);
    $('acknowledge').checked = false;
    location.hash = 'contracts';toast('Plan saved on this device. No payment or mining order was created.');
  } catch (error) { $('plan-error').textContent = error instanceof Error ? error.message : 'Unable to save this plan.'; }
});
for (const id of ['hashrate','term','rail']) $(id).addEventListener('input',updateSummary);
document.querySelectorAll('[data-hashrate]').forEach(button => button.addEventListener('click',() => { $('hashrate').value = button.dataset.hashrate;updateSummary(); }));
$('close-export').addEventListener('click',() => $('export-dialog').close());
window.addEventListener('hashchange',route);
renderDrafts();updateSummary();route();
