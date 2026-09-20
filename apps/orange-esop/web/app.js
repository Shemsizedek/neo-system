const API = window.ORANGE_ESOP_API || "";
const summary = document.querySelector("#summary");
const participants = document.querySelector("#participants");
const controls = document.querySelector("#controls");

async function load() {
  let data = { participants: [] }, reconciliation = { reconciliation: null };
  try {
    data = await fetch(API + "/api/esop/participants").then(r => r.json());
    reconciliation = await fetch(API + "/api/esop/reconcile/status").then(r => r.json());
  } catch {
    // Static preview mode remains usable.
  }
  const rows = data.participants || [];
  summary.innerHTML = [
    ["Participants", rows.length],
    ["NEOTRUST", "Registry layer"],
    ["Reconciliation", reconciliation.reconciliation?.status || "Not run"],
    ["Certificates", "RCF-013"]
  ].map(([k,v]) => `<article class="card"><span>${k}</span><strong>${v}</strong></article>`).join("");

  participants.innerHTML = rows.length ? rows.map(p =>
    `<div class="participant"><div><strong>${escapeHtml(p.legalName||p.templeName||p.participantId)}</strong><br><small>${escapeHtml(p.chaplaincyOffice||p.employeeClass||"Participant")}</small></div><code>${escapeHtml(p.participantId)}</code></div>`
  ).join("") : "<p>No participant records loaded. The application is in controlled setup mode.</p>";

  controls.innerHTML = `<p><strong>Activation state:</strong> development / fail-closed.</p><p>Live allocations and transfers remain disabled until plan, trust, capitalization, valuation, and NEOTRUST mapping gates are satisfied.</p>`;
}

function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.querySelector("#refresh").addEventListener("click", load);
load();
