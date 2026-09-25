import crypto from 'node:crypto';

const safeEqual = (a = '', b = '') => {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

export function requireInternal(config) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    if (!safeEqual(token, config.NEO_INTERNAL_API_KEY || '')) return res.status(401).json({ error: 'unauthorized' });
    next();
  };
}

export function productionWriteGate(config) {
  return (req, res, next) => {
    if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
    if (req.path === '/v1/bridge/dispatch') {
      const blocked = ['financial','custodial','payment','trade','withdrawal'];
      const action = String(req.body?.type || '').toLowerCase();
      if (blocked.some((x) => action.includes(x))) return res.status(403).json({ error: 'action_class_disabled' });
    }
    if (config.enableProductionWrites) return next();
    const supplied = req.headers['x-neo-approval-token'] || '';
    if (config.NEO_APPROVAL_TOKEN && safeEqual(supplied, config.NEO_APPROVAL_TOKEN)) return next();
    return res.status(403).json({ error: 'production_write_approval_required' });
  };
}
