// Noncustodial wallet onboarding for the existing Counterpay/NEOpay portfolio.
const $ = id => document.getElementById(id);
let pending = null;
let issuer = null;
let request = null;
const notice = message => { if ($('walletStatus')) $('walletStatus').textContent = message; };
const show = id => document.querySelectorAll('.wallet-panel').forEach(panel => panel.classList.toggle('active', panel.id === id));
async function walletIssuer() {
  if (issuer) return issuer;
  if (!request) request = import('./wallet-issuance.mjs').then(module => module.walletIssuer).catch(error => { request = null; throw error; });
  issuer = await request;
  return issuer;
}
function wipeBackup({wipeSigner = true} = {}) {
  pending = null;
  $('newWalletWords')?.replaceChildren();
  for (let i = 0; i < 3; i++) if ($('confirmWord' + i)) $('confirmWord' + i).value = '';
  if (wipeSigner) issuer?.clear();
}
function stop() {
  wipeBackup();
  window.dispatchEvent(new Event('neo-wallet-lock'));
}
function renderBackup() {
  const root = $('newWalletWords');
  root.replaceChildren();
  if (!pending) return;
  pending.mnemonic.split(' ').forEach((word, index) => {
    const cell = document.createElement('div');
    cell.className = 'recovery-word';
    const label = document.createElement('span'); label.textContent = String(index + 1).padStart(2, '0');
    const value = document.createElement('strong'); value.textContent = word;
    cell.append(label, value); root.append(cell);
  });
  show('newWalletBackupPanel');
}
function wordChallenges() {
  // Rejection sampling avoids modulo bias.
  const set = new Set();
  while (set.size < 3) {
    const byte = crypto.getRandomValues(new Uint8Array(1))[0];
    if (byte < 240) set.add(byte % 24);
  }
  return [...set].sort((a, b) => a - b);
}
async function create() {
  stop();
  notice('Generating wallet on this device...');
  try {
    const wallet = await walletIssuer();
    pending = await wallet.create();
    renderBackup();
    notice('New Bitcoin mainnet wallet created locally. Back up all 24 words before proceeding.');
  } catch (error) { stop(); notice(error.message || 'Wallet generation failed.'); }
}
function backupSaved() {
  if (!pending) return notice('Create a wallet first.');
  pending.challenges = wordChallenges();
  for (let i = 0; i < 3; i++) {
    $('confirmLabel' + i).textContent = 'Word ' + (pending.challenges[i] + 1);
    $('confirmWord' + i).value = '';
  }
  $('newWalletWords').replaceChildren();
  show('newWalletConfirmPanel');
  notice('Confirm three words from your offline backup.');
}
function finish() {
  if (!pending?.challenges) return notice('Complete the backup first.');
  const words = pending.mnemonic.split(' ');
  const valid = pending.challenges.every((index, i) => $('confirmWord' + i).value.trim().toLowerCase() === words[index]);
  if (!valid) return notice('Backup words did not match. Check your written backup.');
  if (issuer?.getAddress() !== pending.address) { stop(); return notice('Wallet signer mismatch. Creation was cancelled.'); }
  const address = pending.address;
  wipeBackup({wipeSigner: false});  // Keys remain in memory until the user locks the wallet.
  window.dispatchEvent(new CustomEvent('neo-wallet-open', {detail: {address, mode: 'bip39'}}));
}
async function restore() {
  const field = $('restorePhrase');
  const phrase = field.value.trim();
  if (!phrase) return notice('Enter your BIP39 recovery words.');
  notice('Restoring standard Bitcoin wallet locally...');
  try {
    const wallet = await walletIssuer();
    const result = await wallet.restore(phrase);
    field.value = '';
    window.dispatchEvent(new CustomEvent('neo-wallet-open', {detail: {address: result.address, mode: 'bip39'}}));
  } catch (error) {
    issuer?.clear();
    notice(error.message || 'Could not restore wallet.');
  }
}
function init() {
  const restorePanel = $('restorePanel');
  if (!restorePanel) return;
  const welcome = document.createElement('section');
  welcome.id = 'newWalletWelcomePanel';
  welcome.className = 'wallet-panel active';
  welcome.innerHTML = '<h2>Start a Counterpay wallet</h2><p>Create a secure Bitcoin address for BTC and Counterparty-issued assets, or restore one you already own.</p><div class="wallet-actions"><button type="button" class="btn" id="createNewWallet">Create new wallet</button><button type="button" class="btn secondary" id="chooseRecovery">Restore wallet</button></div><p class="wallet-danger">A new address is unfunded and does not issue assets. Never upload or share recovery words.</p>';
  const backup = document.createElement('section');
  backup.id = 'newWalletBackupPanel';
  backup.className = 'wallet-panel';
  backup.innerHTML = '<div class="eyebrow">STEP 1 OF 2 — WALLET BACKUP</div><h2>Save your 24 recovery words</h2><p>Write every word down in order and store the backup offline. Counterpay cannot recover these words for you.</p><div id="newWalletWords" class="recovery-words"></div><p class="wallet-danger">Do not take a screenshot or paste these words into chat, cloud notes or an email. Anyone who has them controls your wallet.</p><div class="wallet-actions"><button type="button" class="btn" id="backupSaved">I saved my recovery words</button><button type="button" class="btn secondary" id="cancelNewWallet">Cancel &amp; discard</button></div>';
  const verify = document.createElement('section');
  verify.id = 'newWalletConfirmPanel';
  verify.className = 'wallet-panel';
  verify.innerHTML = '<div class="eyebrow">STEP 2 OF 2 — VERIFY BACKUP</div><h2>Confirm your backup</h2><p>Enter three requested words from your private written backup.</p><div class="backup-challenge">' + [0,1,2].map(i => '<label><span id="confirmLabel' + i + '">Word</span><input type="text" id="confirmWord' + i + '" autocomplete="off" autocapitalize="none" spellcheck="false"></label>').join('') + '</div><div class="wallet-actions"><button type="button" class="btn" id="confirmNewWallet">Confirm &amp; open wallet</button><button type="button" class="btn secondary" id="viewWordsAgain">View words again</button><button type="button" class="btn secondary" id="cancelConfirmation">Cancel</button></div>';
  restorePanel.before(welcome, backup, verify);
  restorePanel.classList.remove('active');
  if ($('portfolioPanel')?.classList.contains('active')) welcome.classList.remove('active');
  const bip39Button = document.createElement('button');
  bip39Button.type = 'button'; bip39Button.className = 'btn'; bip39Button.id = 'restoreBip39'; bip39Button.textContent = 'Restore standard BIP39 wallet';
  restorePanel.querySelector('.wallet-actions')?.prepend(bip39Button);
  const description = document.createElement('p');
  description.textContent = 'Use BIP39 for standard 12- or 24-word wallet backups. Original 12-word Counterwallet / Counterparty phrases use Restore wallet below.';
  restorePanel.querySelector('h2')?.after(description);
  $('createNewWallet').addEventListener('click', create);
  $('chooseRecovery').addEventListener('click', () => { show('restorePanel'); notice('Choose the recovery method matching your original wallet.'); });
  $('backupSaved').addEventListener('click', backupSaved);
  $('confirmNewWallet').addEventListener('click', finish);
  $('restoreBip39').addEventListener('click', restore);
  $('viewWordsAgain').addEventListener('click', () => { if (pending) renderBackup(); });
  for (const id of ['cancelNewWallet', 'cancelConfirmation']) $(id).addEventListener('click', stop);
  window.addEventListener('neo-wallet-locked', () => wipeBackup());
  window.addEventListener('pagehide', () => wipeBackup());
}
document.addEventListener('DOMContentLoaded', init);
