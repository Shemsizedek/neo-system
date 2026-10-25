// Only normalize Render's configured service hostname. Keep custom domains intact.
export function normalizeRenderHost(req, renderHostname) {
 const expected=String(renderHostname||'').toLowerCase();
 if(!expected || !expected.endsWith('.onrender.com'))return;
 const incoming=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase();
 if(incoming!==expected)return;
 req.headers.host='neo.holytemples.org';
 req.headers['x-forwarded-host']='neo.holytemples.org';
}

export function migrationPreviewBlocks(req,host){
 const path=new URL(req.url||'/', 'https://neo.holytemples.org').pathname;
 return !['GET','HEAD'].includes(req.method) || path.startsWith('/api/') ||
  /^(neopass|neobank|wallet|treasury|court|desk|gateway|neodash)\.holytemples\.org$/.test(host);
}
