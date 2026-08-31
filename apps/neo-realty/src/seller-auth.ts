import crypto from 'node:crypto';

export interface SellerPrincipal {
  id: string;
  role: 'seller' | 'agent';
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function verifySellerBearer(header: string | undefined): SellerPrincipal | null {
  const secret = process.env.NEO_REALTY_SELLER_SESSION_SECRET?.trim();
  if (!secret) return null;
  const token = header?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;
  const expected = crypto.createHmac('sha256', secret).update(payloadPart).digest('base64url');
  const left = Buffer.from(expected);
  const right = Buffer.from(signaturePart);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart));
    if (!payload?.sub || !['seller', 'agent'].includes(payload?.role)) return null;
    if (!Number.isFinite(payload?.exp) || payload.exp * 1000 <= Date.now()) return null;
    return { id: String(payload.sub), role: payload.role };
  } catch {
    return null;
  }
}

export function requireSeller(req: any, res: any, next: any) {
  if (!process.env.NEO_REALTY_SELLER_SESSION_SECRET?.trim()) {
    return res.status(503).json({ error: 'seller_auth_not_configured' });
  }
  const principal = verifySellerBearer(req.headers.authorization);
  if (!principal) return res.status(401).json({ error: 'seller_unauthorized' });
  req.neoRealtyPrincipal = principal;
  next();
}
