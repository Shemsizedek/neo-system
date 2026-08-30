import type { Express, Request, Response } from "express";
import type { Repository } from "./repository.js";

function bearer(req: Request) {
  const header = req.header("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export function attachOpsRoutes(app: Express, repository: Repository) {
  app.get("/ready", async (_req: Request, res: Response) => {
    const ready = await repository.ping();
    return res.status(ready ? 200 : 503).json({
      service: "NEO_PADS",
      ready,
      persistence: repository.mode,
      checkedAt: new Date().toISOString()
    });
  });

  app.get("/ops/reconciliation", async (req: Request, res: Response) => {
    const expected = process.env.NEO_PADS_OPS_TOKEN;
    if (!expected) return res.status(503).json({ error: "ops_token_not_configured" });
    if (bearer(req) !== expected) return res.status(401).json({ error: "unauthorized" });

    try {
      const summary = await repository.getReconciliationSummary();
      return res.json({ service: "NEO_PADS", persistence: repository.mode, ...summary });
    } catch {
      return res.status(503).json({ error: "reconciliation_unavailable" });
    }
  });
}
