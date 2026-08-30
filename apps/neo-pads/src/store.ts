import fs from "node:fs";
import path from "node:path";

export interface RuntimeStoreShape {
  properties: Record<string, unknown>;
  bookings: Record<string, unknown>;
  processedWebhookEvents: Record<string, number>;
  verifiedWallets: Record<string, { verifiedAt: number; challengeId: string }>;
}

const emptyStore = (): RuntimeStoreShape => ({
  properties: {},
  bookings: {},
  processedWebhookEvents: {},
  verifiedWallets: {}
});

export class RuntimeStore {
  private data: RuntimeStoreShape;
  private readonly filePath?: string;

  constructor(filePath = process.env.NEO_PADS_DATA_FILE) {
    this.filePath = filePath;
    this.data = this.read();
  }

  private read(): RuntimeStoreShape {
    if (!this.filePath) return emptyStore();
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      return { ...emptyStore(), ...JSON.parse(raw) };
    } catch {
      return emptyStore();
    }
  }

  private flush() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2));
    fs.renameSync(temp, this.filePath);
  }

  get properties() { return this.data.properties; }
  get bookings() { return this.data.bookings; }

  setProperty(id: string, value: unknown) {
    this.data.properties[id] = value;
    this.flush();
  }

  setBooking(id: string, value: unknown) {
    this.data.bookings[id] = value;
    this.flush();
  }

  markWalletVerified(wallet: string, challengeId: string) {
    this.data.verifiedWallets[wallet] = { verifiedAt: Date.now(), challengeId };
    this.flush();
  }

  isWalletVerified(wallet: string) {
    return Boolean(this.data.verifiedWallets[wallet]);
  }

  hasWebhookEvent(eventId: string) {
    return Boolean(this.data.processedWebhookEvents[eventId]);
  }

  markWebhookEvent(eventId: string) {
    this.data.processedWebhookEvents[eventId] = Date.now();
    this.flush();
  }
}
