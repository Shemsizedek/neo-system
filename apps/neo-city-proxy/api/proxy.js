const ORIGIN_HOST = 'nuuniversitytxdot.wordpress.com';
const ORIGIN = `https://${ORIGIN_HOST}`;
const PUBLIC_HOST = 'city.holytemples.org';
const PUBLIC_ORIGIN = `https://${PUBLIC_HOST}`;

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length'
]);

function rewriteText(text) {
  return text
    .replaceAll(`https://${ORIGIN_HOST}`, PUBLIC_ORIGIN)
    .replaceAll(`http://${ORIGIN_HOST}`, PUBLIC_ORIGIN)
    .replaceAll(`//${ORIGIN_HOST}`, `//${PUBLIC_HOST}`);
}

export default async function handler(req, res) {
  try {
    const rawPath = typeof req.query.path === 'string' ? req.query.path : '';
    const url = new URL(`${ORIGIN}/${rawPath}`);

    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
      else if (value != null) url.searchParams.set(key, value);
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('host', ORIGIN_HOST);
    headers.set('x-forwarded-host', PUBLIC_HOST);
    headers.set('x-forwarded-proto', 'https');

    const init = { method: req.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      init.body = Buffer.concat(chunks);
    }

    const upstream = await fetch(url, init);
    const contentType = upstream.headers.get('content-type') || '';

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'content-length' || lower === 'content-encoding') return;
      if (lower === 'location') {
        res.setHeader(key, rewriteText(value));
        return;
      }
      if (lower === 'set-cookie') return;
      res.setHeader(key, value);
    });

    res.setHeader('x-neo-proxy', 'city-holytemples');
    res.setHeader('x-robots-tag', 'noarchive');
    res.status(upstream.status);

    if (req.method === 'HEAD') return res.end();

    if (/text\/(html|css|javascript)|application\/(javascript|json|xml)|image\/svg\+xml/i.test(contentType)) {
      return res.send(rewriteText(await upstream.text()));
    }

    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('NEO City proxy error:', error);
    return res.status(502).send('NEO City proxy upstream error');
  }
}
