import http from 'node:http';

export function mountCesRuntime({ primary, ces }) {
  return http.createServer((req, res) => {
    if ((req.url || '').startsWith('/ces/')) {
      req.url = req.url.slice(4);
      return ces.emit('request', req, res);
    }
    return primary.emit('request', req, res);
  });
}
