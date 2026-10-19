/**
 * Legacy CES coordinator adapter boundary.
 * Only an authorized, scoped service identity may perform legacy operations.
 * No credentials, session cookies, or MFA bypass data are stored here.
 */
export type CesDuty = "member.lookup" | "balance.read" | "trade.review" | "trade.approve" | "credit.adjust" | "report.export";
export interface CoordinatorGrant {
  organizationId: string;
  coordinatorId: string;
  neoBankAccountId: string;
  allowedDuties: CesDuty[];
  expiresAt: string;
  active: boolean;
}
export interface CesCommand {
  commandId: string;
  organizationId: string;
  coordinatorId: string;
  neoBankAccountId: string;
  duty: CesDuty;
  targetReference: string;
  evidenceReference: string;
  requestedAt: string;
  approvalReference?: string;
}
export interface CesExecutionReceipt {
  commandId: string;
  status: "queued" | "needs-approval" | "completed" | "failed";
  legacyReference?: string;
  evidenceReference?: string;
  reason?: string;
}
const sensitive: CesDuty[] = ["trade.approve", "credit.adjust"];
export function authorizeCesCommand(command: CesCommand, grant: CoordinatorGrant, now: string): CesExecutionReceipt {
  if (!command.commandId || !command.evidenceReference || !command.targetReference) throw new Error("Command identity and evidence required");
  if (!grant.active || grant.expiresAt <= now) throw new Error("Coordinator grant expired or inactive");
  if (grant.organizationId !== command.organizationId || grant.coordinatorId !== command.coordinatorId || grant.neoBankAccountId !== command.neoBankAccountId) throw new Error("Coordinator identity or organization mismatch");
  if (!grant.allowedDuties.includes(command.duty)) throw new Error("Duty outside coordinator authorization");
  if (sensitive.includes(command.duty) && !command.approvalReference) return { commandId: command.commandId, status: "needs-approval" };
  return { commandId: command.commandId, status: "queued" };
}
export interface LegacyCesExecutor {
  /** Implementation must use authorized API or supervised browser session, never bypass authentication. */
  execute(command: CesCommand): Promise<CesExecutionReceipt>;
}
export class CesCoordinatorGateway {
  private readonly receipts = new Map<string, CesExecutionReceipt>();
  constructor(private readonly executor: LegacyCesExecutor) {}
  async dispatch(command: CesCommand, grant: CoordinatorGrant, now: string): Promise<CesExecutionReceipt> {
    const key = command.organizationId + ":" + command.commandId;
    const existing = this.receipts.get(key);
    if (existing) return { ...existing };
    const decision = authorizeCesCommand(command, grant, now);
    if (decision.status !== "queued") return decision;
    // In production, persist idempotency and claim work atomically BEFORE external execution.
    this.receipts.set(key, decision);
    try {
      const result = await this.executor.execute(command);
      this.receipts.set(key, result);
      return { ...result };
    } catch {
      const failed: CesExecutionReceipt = { commandId: command.commandId, status: "failed", reason: "Legacy executor error; reconciliation required before retry" };
      this.receipts.set(key, failed);
      return { ...failed };
    }
  }
}
