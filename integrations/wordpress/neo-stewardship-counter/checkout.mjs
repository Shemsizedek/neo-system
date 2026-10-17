import { quoteStewardship } from './pricing.mjs';

export function mountStewardship(root, references = {}, clock = Date.now, schedule = setTimeout, unschedule = clearTimeout) {
  const form = root.querySelector('[data-quote-form]');
  const output = root.querySelector('output');
  const priceStatus = root.querySelector('[data-price-status]');
  const select = form.elements.purpose;
  let timer;
  const asset = () => select.value === 'adept' ? 'TEMPLEBOND' : 'PLEDGEBOND';
  const clear = () => {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
    output.textContent = '';
  };
  const format = (value, currency) => {
    const decimals = currency === 'USD' ? 2 : 8;
    const padded = value.padStart(decimals + 1, '0');
    return padded.slice(0, -decimals) + '.' + padded.slice(-decimals) + ' ' + currency;
  };
  const calculate = () => quoteStewardship({
    ...references[asset()], asset: asset(), quantity: form.elements.quantity.value
  }, clock());
  const update = () => {
    clear();
    const symbol = asset();
    root.querySelector('[data-description]').textContent = symbol === 'TEMPLEBOND'
      ? 'TEMPLEBOND represents an Adept’s deeper commitment to the Temple mission.'
      : 'PLEDGEBOND represents member participation and stewardship pledges.';
    const link = root.querySelector('[data-asset]');
    const selectedExplorer = root.getAttribute('data-ledger-explorer');
    const explorer = ['https://classic.tokenscan.io','https://cp20.tokenscan.io'].includes(selectedExplorer) ? selectedExplorer : 'https://tokenscan.io';
    link.href = explorer + '/asset/' + symbol;
    link.textContent = 'View ' + symbol + ' on TokenScan';
    try {
      const q = calculate();
      priceStatus.textContent = 'TokenScan market snapshot available in ' + q.currency + '. Review to see the full fee breakdown.';
    } catch {
      priceStatus.textContent = 'Pricing unavailable: a current verified market reference and fee schedule are required. No payment is requested.';
    }
  };
  form.addEventListener('input', clear);
  select.addEventListener('change', update);
  form.addEventListener('submit', event => {
    event.preventDefault();
    clear();
    if (!form.reportValidity()) return;
    if (root.getAttribute('data-form144-received') !== '1') {
      output.textContent = 'Upload your completed Form 144 before reviewing either bond selection.';
      return;
    }
    try {
      const q = calculate();
      const money = v => format(v, q.currency);
      output.textContent = [
        'Stewardship quote preview',
        'Path: ' + select.options[select.selectedIndex].text,
        'Instrument: ' + q.asset + ' · Quantity: ' + q.quantity,
        'Market subtotal: ' + money(q.marketSubtotalMinor),
        'Market spread: ' + money(q.spreadMinor),
        'Fee allowance: ' + money(q.feeAllowanceMinor),
        'Percentage processing fee: ' + money(q.processorFeeMinor),
        'Upward rounding: ' + money(q.roundingAdjustmentMinor),
        'Total preview: ' + money(q.totalMinor),
        'Source: ' + q.source + ' · Reference: ' + q.referenceId,
        'Snapshot retrieved: ' + new Date(q.observedAt).toISOString(),
        'Expires: ' + new Date(q.expiresAt).toISOString(),
        'REFERENCE PREVIEW — no payment, token delivery or insurance coverage activated.'
      ].join('\n');
      timer = schedule(() => {
        output.textContent = 'Quote expired. Refresh to obtain a current market reference.';
        priceStatus.textContent = 'Quote expired — no payment is requested.';
      }, q.expiresAt - clock());
    } catch {
      output.textContent = 'Quote unavailable. Current market pricing and fee inputs could not be verified. No order or payment has been created.';
    }
  });
  update();
}
