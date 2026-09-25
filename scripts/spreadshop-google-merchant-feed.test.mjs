import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("builds a Google Merchant RSS feed from Spreadshop sellables", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spreadshop-feed-"));
  const input = path.join(dir, "sellables.json");
  const out = path.join(dir, "out");
  fs.writeFileSync(input, JSON.stringify({
    shop_id: "123",
    platform: "na",
    sellables: [{
      sellableId: "abc",
      name: "Noocrat Tee",
      description: "House of Negus shirt",
      shopUrl: "https://example.com/noocrat-tee",
      imageUrl: "https://example.com/noocrat.jpg",
      price: { amount: 28.88, currency: "USD" }
    }]
  }));

  const run = spawnSync(process.execPath, ["scripts/spreadshop-google-merchant-feed.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SPREADSHOP_SELLABLES_PATH: input,
      GOOGLE_MERCHANT_OUTPUT_DIR: out,
      SPREADSHOP_STORE_URL: "https://example.com"
    },
    encoding: "utf8"
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const xml = fs.readFileSync(path.join(out, "google-merchant.xml"), "utf8");
  assert.match(xml, /<g:id>abc<\/g:id>/);
  assert.match(xml, /<g:title>Noocrat Tee<\/g:title>/);
  assert.match(xml, /28\.88 USD/);
});
