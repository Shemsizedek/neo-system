/* Project 144: local, opt-in NEO Oracle member consultation enhancements.
 * The Oracle is the Temple Adept. No external AI, payment, or storage API is called.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const KEY = "neo.oracle.encrypted-journal.v1";
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const spreads = { one: "Direct message", future: "Future · Present · Past", action: "Situation · Action", challenge: "Challenge", life: "Life pathway", soul: "Soul reflection" };
  const intents = { discernment: "Discernment", service: "Community service", relationship: "Relationships", purpose: "Life direction", reconciliation: "Reconciliation" };

  function notify(message, isError = false) {
    const el = $("journalStatus");
    el.textContent = message;
    el.setAttribute("role", isError ? "alert" : "status");
  }

  function ensureCrypto() {
    if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
      throw new Error("Encrypted journal requires a secure HTTPS connection and a modern browser.");
    }
    if (typeof window.localStorage === "undefined") {
      throw new Error("This browser does not support local storage.");
    }
  }

  function base64(data) {
    let str = "";
    for (const b of data) str += String.fromCharCode(b);
    return btoa(str);
  }

  function bytes(encoded) {
    return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  }

  async function keyFromPassphrase(passphrase, salt) {
    const initial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
      initial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function seal(readings, passphrase) {
    ensureCrypto();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFromPassphrase(passphrase, salt);
    const payload = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(readings)));
    return { format: "neo-oracle-journal", version: 1, kdf: "PBKDF2-SHA256-250000", cipher: "AES-256-GCM",
      salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(payload)) };
  }

  async function unseal(envelope, passphrase) {
    ensureCrypto();
    if (!envelope || envelope.format !== "neo-oracle-journal" || envelope.version !== 1 ||
        envelope.kdf !== "PBKDF2-SHA256-250000" || envelope.cipher !== "AES-256-GCM") {
      throw new Error("The saved journal format is not supported.");
    }
    try {
      const key = await keyFromPassphrase(passphrase, bytes(envelope.salt));
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(envelope.iv) }, key, bytes(envelope.ciphertext));
      const entries = JSON.parse(dec.decode(plaintext));
      if (!Array.isArray(entries) || entries.length > 100) throw new Error("Invalid journal data");
      return entries;
    } catch {
      throw new Error("Unable to unlock. Check the passphrase or restore a valid encrypted backup.");
    }
  }

  function stored() {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function passphrase() {
    const p = $("journalPass").value;
    if (p.length < 12) throw new Error("Use a passphrase with at least 12 characters.");
    return p;
  }

  function forgetPassphrase() {
    $("journalPass").value = "";
  }

  function download(filename, data) {
    const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderEntries(entries) {
    const container = $("privateEntries");
    container.replaceChildren();
    const heading = document.createElement("p");
    heading.textContent = entries.length + " reading(s) unlocked for this session. Close or refresh this page to hide them.";
    container.appendChild(heading);
    for (const reading of entries.slice().reverse()) {
      const article = document.createElement("article");
      article.className = "journal-entry";
      const label = document.createElement("strong");
      label.textContent = (reading.date ? new Date(reading.date).toLocaleString() : "Undated") +
        " · " + (spreads[reading.spread] || "Consultation");
      const question = document.createElement("p");
      question.textContent = reading.question || "(Question not recorded)";
      const summary = document.createElement("p");
      summary.className = "note";
      summary.textContent = (reading.stones || []).map((stone) => stone.name).join(" · ");
      article.append(label, question, summary);
      container.appendChild(article);
    }
  }

  function counsel(reading) {
    const stones = reading.stones || [];
    const first = stones[0], last = stones[stones.length - 1];
    const intent = intents[reading.intent] || "Discernment";
    const lines = [
      "The Temple Adept Oracle offers an extended symbolic reflection on " + intent.toLowerCase() + ". This is a spiritual interpretation, not a verified ancestral transmission.",
      "First counsel: " + (first ? first.name + " (" + first.meaning + ")" : "The opening stone") + " invites you to separate what you know from what you hope or fear.",
      "Second counsel: " + (last ? last.name + " (" + last.meaning + ")" : "The closing stone") + " invites you to consider the effects of your choices on others.",
      "Discernment: What observation supports your interpretation? What evidence might change it?",
      "Adept practice: Write one modest, reversible next step. Reflect again after new information appears."
    ];
    return lines;
  }

  $("cast").addEventListener("click", () => {
    if (!current) return;
    current.intent = $("intent").value;
    current.adeptGuidance = null;
    $("extendedGuidance").hidden = false;
    $("guidanceOutput").replaceChildren();
    $("guidanceOutput").hidden = true;
    notify("Your current reading remains in memory until you explicitly save it.");
  });

  $("previewGuidance").addEventListener("click", () => {
    if (!current) { notify("Cast stones before seeking extended guidance.", true); return; }
    const lines = counsel(current);
    const out = $("guidanceOutput");
    out.replaceChildren();
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      out.appendChild(p);
    });
    current.adeptGuidance = lines;
    out.hidden = false;
  });

  $("saveEncrypted").addEventListener("click", async () => {
    let p = "";
    try {
      if (!current) throw new Error("Cast a reading before saving it.");
      p = passphrase();
      const envelope = stored();
      const entries = envelope ? await unseal(envelope, p) : [];
      if (entries.length >= 100) throw new Error("This journal has reached 100 readings. Export a backup before starting a new journal.");
      entries.push(JSON.parse(JSON.stringify(current)));
      const encrypted = await seal(entries, p);
      localStorage.setItem(KEY, JSON.stringify(encrypted));
      $("privateEntries").replaceChildren();
      notify("Encrypted reading saved on this device. Keep your passphrase: it cannot be recovered.");
    } catch (error) {
      notify(error.message || "Unable to save the reading.", true);
    } finally {
      p = "";
      forgetPassphrase();
    }
  });

  $("unlockJournal").addEventListener("click", async () => {
    let p = "";
    try {
      p = passphrase();
      const envelope = stored();
      if (!envelope) throw new Error("No encrypted journal is saved on this device.");
      renderEntries(await unseal(envelope, p));
      notify("Journal unlocked on this page. The passphrase was cleared.");
    } catch (error) {
      notify(error.message || "Unable to unlock journal.", true);
    } finally {
      p = "";
      forgetPassphrase();
    }
  });

  $("exportEncrypted").addEventListener("click", () => {
    try {
      const envelope = stored();
      if (!envelope) throw new Error("Save an encrypted reading before exporting.");
      download("neo-oracle-encrypted-journal.json", envelope);
      notify("Encrypted backup downloaded. Keep its passphrase separately.");
    } catch (error) {
      notify(error.message || "Unable to export journal.", true);
    }
  });

  $("eraseEncrypted").addEventListener("click", () => {
    if (!stored()) { notify("There is no encrypted journal to erase."); return; }
    if (!confirm("Permanently erase the encrypted Oracle journal from this browser? Keep an exported backup first if needed.")) return;
    localStorage.removeItem(KEY);
    $("privateEntries").replaceChildren();
    forgetPassphrase();
    notify("Encrypted journal erased from this browser. Existing downloaded backups are not affected.");
  });

  // The original downloadable entry is intentionally plaintext and requires explicit consent.
  const originalDownload = $("journal");
  originalDownload.textContent = "Export current reading (unencrypted)";
  originalDownload.addEventListener("click", (event) => {
    if (!current) return;
    if (!confirm("This downloads an UNENCRYPTED reading to your device. Use the encrypted journal below for private storage. Continue?")) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  // There is no member identity verification, billing, or paid entitlement in a static GitHub Pages app.
  $("premiumStatus").textContent = "Premium consultation preview only. No checkout, billing, or paid membership activation is enabled.";
})();
