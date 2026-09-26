import { execFileSync } from "node:child_process";

const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const feedUrl = process.env.GOOGLE_MERCHANT_FEED_URL || "https://shemsizedek.github.io/neo-system/api/merchant/google-merchant.xml";
const base = "https://merchantapi.googleapis.com/datasources/v1";

function getToken() {
  if (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN) return process.env.GOOGLE_MERCHANT_ACCESS_TOKEN.trim();
  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No Google Merchant access token available. Set GOOGLE_MERCHANT_ACCESS_TOKEN or authenticate gcloud.");
  }
}

async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(base + path, {
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
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${res.status} ${res.statusText}\n${JSON.stringify(payload, null, 2)}`);
  }
  return payload;
}

const action = process.argv[2] || "list";

async function listAllDataSources() {
  const all = [];
  let pageToken = "";
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await api(`/accounts/${accountId}/dataSources?${qs.toString()}`);
    all.push(...(data?.dataSources || []));
    pageToken = data?.nextPageToken || "";
  } while (pageToken);
  return all;
}

if (action === "list") {
  const dataSources = await listAllDataSources();
  console.log(JSON.stringify({ dataSources, count: dataSources.length }, null, 2));
  process.exit(0);
}

if (action === "provision") {
  if (process.env.GOOGLE_MERCHANT_APPLY !== "CONFIRM_PROVISION_SPREADSHOP_SOURCE") {
    throw new Error("Refusing provision. Set GOOGLE_MERCHANT_APPLY=CONFIRM_PROVISION_SPREADSHOP_SOURCE.");
  }

  const current = await listAllDataSources();
  const existing = current.find(
    x => x.displayName === "House of Negus — Spreadshop (NEO)"
  );

  let source = existing;
  if (!source) {
    const body = {
      displayName: "House of Negus — Spreadshop (NEO)",
      primaryProductDataSource: {
        feedLabel: "US",
        contentLanguage: "en",
        countries: ["US"]
      },
      fileInput: {
        fetchSettings: {
          enabled: true,
          frequency: "FREQUENCY_DAILY",
          timeOfDay: { hours: 9 },
          timeZone: "America/Chicago",
          fetchUri: feedUrl
        }
      }
    };
    source = await api(`/accounts/${accountId}/dataSources`, { method: "POST", body });
  }

  const sourceId = source?.dataSourceId || source?.name?.split("/").pop();
  if (!sourceId) throw new Error("Created/found Merchant data source but could not determine its ID.");

  let visible = null;
  for (let i = 0; i < 18; i++) {
    try {
      visible = await api(`/accounts/${accountId}/dataSources/${sourceId}`);
      if (visible) break;
    } catch (err) {
      if (!/404|NOT_FOUND/i.test(String(err))) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!visible) throw new Error(`Data source ${sourceId} did not become readable within 90 seconds.`);

  let fetched = false;
  for (let i = 0; i < 12; i++) {
    try {
      await api(`/accounts/${accountId}/dataSources/${sourceId}:fetch`, { method: "POST" });
      fetched = true;
      break;
    } catch (err) {
      if (!/404|NOT_FOUND/i.test(String(err))) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  if (!fetched) throw new Error(`Data source ${sourceId} was visible but fetch endpoint was not ready within 60 seconds.`);

  let latest = null;
  for (let i = 0; i < 24; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      latest = await api(`/accounts/${accountId}/dataSources/${sourceId}/fileUploads/latest`);
      if (latest) break;
    } catch (err) {
      if (!/404|NOT_FOUND/i.test(String(err))) throw err;
    }
  }

  console.log(JSON.stringify({
    provisioned: true,
    reused_existing_source: Boolean(existing),
    data_source_id: sourceId,
    data_source: visible || source,
    latest_file_upload: latest
  }, null, 2));
  process.exit(0);
}

if (action === "retirement-preflight") {
  const replacementId = process.env.GOOGLE_MERCHANT_REPLACEMENT_SOURCE_ID || "10748120384";
  const legacyId = process.env.GOOGLE_MERCHANT_LEGACY_SOURCE_ID || "10432070529";

  const replacement = await api(`/accounts/${accountId}/dataSources/${replacementId}`);
  const replacementUpload = await api(`/accounts/${accountId}/dataSources/${replacementId}/fileUploads/latest`);
  const legacy = await api(`/accounts/${accountId}/dataSources/${legacyId}`);

  const checks = {
    replacement_name_ok: replacement?.displayName === "House of Negus — Spreadshop (NEO)",
    replacement_processing_succeeded: replacementUpload?.processingState === "SUCCEEDED",
    replacement_item_count_ok: Number(replacementUpload?.itemsTotal || 0) >= 2803,
    legacy_name_ok: legacy?.displayName === "Products source - The House",
    legacy_input_is_api: legacy?.input === "API"
  };

  const ok = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({
    ok,
    account_id: accountId,
    replacement_source_id: replacementId,
    replacement: {
      displayName: replacement?.displayName,
      input: replacement?.input,
      processingState: replacementUpload?.processingState,
      itemsTotal: replacementUpload?.itemsTotal,
      itemsCreated: replacementUpload?.itemsCreated
    },
    legacy_source_id: legacyId,
    legacy: {
      displayName: legacy?.displayName,
      input: legacy?.input,
      feedLabel: legacy?.primaryProductDataSource?.feedLabel,
      contentLanguage: legacy?.primaryProductDataSource?.contentLanguage
    },
    checks
  }, null, 2));

  if (!ok) process.exit(2);
  process.exit(0);
}

if (action === "wait-status") {
  const id = process.env.GOOGLE_MERCHANT_DATASOURCE_ID || "10748120384";
  let latest = null;
  for (let i = 0; i < 30; i++) {
    try {
      latest = await api(`/accounts/${accountId}/dataSources/${id}/fileUploads/latest`);
      const state = latest?.processingState || "";
      console.log(JSON.stringify({ attempt: i + 1, state, latest }, null, 2));
      if (state === "SUCCEEDED") process.exit(0);
      if (state === "FAILED") process.exit(2);
    } catch (err) {
      if (!/404|NOT_FOUND/i.test(String(err))) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error("Merchant file upload did not reach a terminal state within 5 minutes.");
}

if (action === "create") {
  if (process.env.GOOGLE_MERCHANT_APPLY !== "CONFIRM_CREATE_SPREADSHOP_SOURCE") {
    throw new Error("Refusing create. Set GOOGLE_MERCHANT_APPLY=CONFIRM_CREATE_SPREADSHOP_SOURCE.");
  }
  const body = {
    displayName: "House of Negus — Spreadshop (NEO)",
    primaryProductDataSource: {
      feedLabel: "US",
      contentLanguage: "en",
      countries: ["US"]
    },
    fileInput: {
      fetchSettings: {
        enabled: true,
        frequency: "FREQUENCY_DAILY",
        timeOfDay: { hours: 9 },
        timeZone: "America/Chicago",
        fetchUri: feedUrl
      }
    }
  };
  const data = await api(`/accounts/${accountId}/dataSources`, { method: "POST", body });
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const dataSourceId = process.env.GOOGLE_MERCHANT_DATASOURCE_ID;
if (!dataSourceId) throw new Error("GOOGLE_MERCHANT_DATASOURCE_ID is required for this action.");
const dsPath = `/accounts/${accountId}/dataSources/${dataSourceId}`;

if (action === "fetch") {
  if (process.env.GOOGLE_MERCHANT_APPLY !== "CONFIRM_FETCH") {
    throw new Error("Refusing fetch. Set GOOGLE_MERCHANT_APPLY=CONFIRM_FETCH.");
  }
  const data = await api(dsPath + ":fetch", { method: "POST" });
  console.log(JSON.stringify(data ?? { ok: true }, null, 2));
  process.exit(0);
}

if (action === "status") {
  const data = await api(dsPath + "/fileUploads/latest");
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

if (action === "delete") {
  if (process.env.GOOGLE_MERCHANT_APPLY !== `CONFIRM_DELETE_${dataSourceId}`) {
    throw new Error(`Refusing delete. Set GOOGLE_MERCHANT_APPLY=CONFIRM_DELETE_${dataSourceId}.`);
  }
  const data = await api(dsPath, { method: "DELETE" });
  console.log(JSON.stringify(data ?? { deleted: dataSourceId }, null, 2));
  process.exit(0);
}

throw new Error(`Unsupported action: ${action}`);
