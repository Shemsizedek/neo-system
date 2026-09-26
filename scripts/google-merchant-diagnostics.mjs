import { writeFile } from "node:fs/promises";

const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

async function api(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status} ${res.statusText}\n${JSON.stringify(payload, null, 2)}`);
  return payload;
}

const aggregateUrl = `https://merchantapi.googleapis.com/accounts/v1/accounts/${accountId}/aggregateProductStatuses?pageSize=1000`;
const aggregate = await api(aggregateUrl);

async function runReport(query) {
  const rows = [];
  let pageToken = "";
  do {
    const body = { query, pageSize: 1000, ...(pageToken ? { pageToken } : {}) };
    const data = await api(`https://merchantapi.googleapis.com/reports/v1/accounts/${accountId}/reports:search`, {
      method: "POST",
      body
    });
    rows.push(...(data?.results || []));
    pageToken = data?.nextPageToken || "";
  } while (pageToken);
  return rows;
}

const statusQueries = {
  disapproved: "SELECT id, offer_id, title, aggregated_reporting_context_status, item_issues FROM product_view WHERE aggregated_reporting_context_status = 'NOT_ELIGIBLE_OR_DISAPPROVED'",
  pending: "SELECT id, offer_id, title, aggregated_reporting_context_status, item_issues FROM product_view WHERE aggregated_reporting_context_status = 'PENDING'",
  limited: "SELECT id, offer_id, title, aggregated_reporting_context_status, item_issues FROM product_view WHERE aggregated_reporting_context_status = 'ELIGIBLE_LIMITED'"
};

const [disapproved, pending, limited] = await Promise.all([
  runReport(statusQueries.disapproved),
  runReport(statusQueries.pending),
  runReport(statusQueries.limited)
]);

const issueCounts = {};
for (const row of [...disapproved, ...pending, ...limited]) {
  for (const issue of row?.productView?.itemIssues || []) {
    const code = issue?.type?.code || "UNKNOWN";
    issueCounts[code] = (issueCounts[code] || 0) + 1;
  }
}

const result = {
  account_id: accountId,
  checked_at: new Date().toISOString(),
  aggregate_product_statuses: aggregate?.aggregateProductStatuses || [],
  report_counts: {
    disapproved: disapproved.length,
    pending: pending.length,
    eligible_limited: limited.length
  },
  top_issue_codes: Object.entries(issueCounts)
    .sort((a,b) => b[1]-a[1])
    .slice(0,25)
    .map(([code,count]) => ({code,count})),
  sample_disapproved: disapproved.slice(0,25).map(r => r.productView),
  sample_pending: pending.slice(0,25).map(r => r.productView),
  sample_eligible_limited: limited.slice(0,25).map(r => r.productView)
};

await writeFile("merchant-diagnostics.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
