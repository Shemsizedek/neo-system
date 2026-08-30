import crypto from "node:crypto";

export interface WalletChallenge {
  id: string;
  wallet: string;
  nonce: string;
  message: string;
  expiresAt: number;
  consumed: boolean;
}

const challenges = new Map<string, WalletChallenge>();

export function createWalletChallenge(wallet: string): WalletChallenge {
  const id = crypto.randomUUID();
  const nonce = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60_000;
  const message = `NEO Pads wallet verification\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`;
  const challenge = { id, wallet, nonce, message, expiresAt, consumed: false };
  challenges.set(id, challenge);
  return challenge;
}

export function getWalletChallenge(id: string) {
  return challenges.get(id);
}

export function consumeWalletChallenge(id: string) {
  const challenge = challenges.get(id);
  if (!challenge) return false;
  challenge.consumed = true;
  return true;
}

export async function verifyWalletSignature(input: {
  challenge: WalletChallenge;
  signature: string;
}): Promise<boolean> {
  if (input.challenge.consumed || input.challenge.expiresAt < Date.now()) return false;

  const verifier = process.env.WALLET_SIGNATURE_VERIFY_URL;
  if (!verifier) throw new Error("wallet_signature_verifier_not_configured");

  const response = await fetch(verifier, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.WALLET_SIGNATURE_VERIFY_API_KEY
        ? { authorization: `Bearer ${process.env.WALLET_SIGNATURE_VERIFY_API_KEY}` }
        : {})
    },
    body: JSON.stringify({
      address: input.challenge.wallet,
      message: input.challenge.message,
      signature: input.signature
    })
  });

  if (!response.ok) return false;
  const body = (await response.json()) as { valid?: boolean; verified?: boolean };
  return body.valid === true || body.verified === true;
}

export function verifyWebhookSignature(rawBody: Buffer, suppliedSignature?: string): boolean {
  const secret = process.env.NEO_COUNTER_WEBHOOK_SECRET;
  if (!secret || !suppliedSignature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const supplied = suppliedSignature.replace(/^sha256=/, "");
  if (expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}
