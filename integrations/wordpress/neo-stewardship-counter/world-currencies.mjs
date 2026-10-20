export function filterCurrencyRows(rows, query) {
  const key = String(query).trim().toLocaleLowerCase();
  return rows.map(row => String(row).toLocaleLowerCase().includes(key));
}
export function mountWorldCurrencies(root) {
  if (root.dataset.currencyMounted) return;
  root.dataset.currencyMounted = '1';
  const input = root.querySelector('[data-currency-search]');
  const count = root.querySelector('[data-currency-count]');
  const rows = [...root.querySelectorAll('[data-currency-row]')];
  if (!input || !count) return;
  input.addEventListener('input', () => {
    const matches = filterCurrencyRows(rows.map(row => row.textContent), input.value);
    rows.forEach((row, i) => { row.hidden = !matches[i]; });
    count.textContent = `${matches.filter(Boolean).length} of ${rows.length} currencies`;
  });
}
