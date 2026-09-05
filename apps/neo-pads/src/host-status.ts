import type { Express, Request, Response } from "express";
import type { Repository } from "./repository.js";

function authorityState(property: { propertyAuthorityVerified: boolean; status: string }) {
  if (property.propertyAuthorityVerified) return "VERIFIED";
  return property.status === "SUSPENDED" ? "REVOKED" : "PENDING";
}

export function attachHostStatusRoutes(app: Express, repository: Repository) {
  app.get("/pads/properties/:id/status", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const wallet = String(req.query.wallet ?? "").trim();
    if (!wallet || !(await repository.isWalletVerified(wallet))) {
      return res.status(403).json({ error: "verified_host_wallet_required" });
    }

    const property = await repository.getProperty(String(req.params.id));
    if (!property || property.hostWallet !== wallet) {
      return res.status(404).json({ error: "property_not_found" });
    }

    return res.json({
      propertyId: property.id,
      authorityState: authorityState(property),
      propertyStatus: property.status,
      propertyAuthorityVerified: property.propertyAuthorityVerified,
      canActivate: property.propertyAuthorityVerified && property.status !== "SUSPENDED"
    });
  });
}
