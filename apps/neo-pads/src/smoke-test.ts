const base = process.env.NEO_PADS_BASE_URL ?? "http://127.0.0.1:8788";

async function expectOk(path: string) {
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`${path}_failed:${response.status}`);
  return response.json();
}

async function main() {
  const health = await expectOk("/health");
  if (health?.service !== "NEO_PADS" || health?.status !== "ok") {
    throw new Error("health_payload_invalid");
  }

  const ready = await expectOk("/ready");
  if (ready?.ready !== true) throw new Error("service_not_ready");

  console.log(JSON.stringify({ smoke: "passed", persistence: health.persistence, ready: true }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
