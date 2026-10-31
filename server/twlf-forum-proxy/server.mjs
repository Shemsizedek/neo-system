import http from 'node:http';
import https from 'node:https';

const PORT = Number(process.env.PORT || 10000);
const SOURCE = new URL('https://twlfworldhq.wordpress.com/');

function rewrite(body=''){
  return String(body)
    .replaceAll('https://twlfworldhq.wordpress.com', 'https://forum.holytemples.org')
    .replaceAll('http://twlfworldhq.wordpress.com', 'https://forum.holytemples.org');
}

function proxy(req,res){
  const target = new URL(req.url || '/', SOURCE);
  const upstream = https.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: 443,
    path: target.pathname + target.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: SOURCE.hostname,
      'accept-encoding': 'identity',
      'x-forwarded-host': 'forum.holytemples.org'
    }
  }, up => {
    const chunks=[];
    up.on('data',c=>chunks.push(c));
    up.on('end',()=>{
      const buf=Buffer.concat(chunks);
      const type=String(up.headers['content-type']||'');
      const headers={...up.headers};
      delete headers['content-length'];
      delete headers['content-encoding'];
      headers['x-neo-source']='twlfworldhq.wordpress.com';
      headers['cache-control']='public, max-age=300, stale-while-revalidate=3600';
      if(type.includes('text/html') || type.includes('text/css') || type.includes('javascript')){
        const out=Buffer.from(rewrite(buf.toString('utf8')));
        headers['content-length']=String(out.length);
        res.writeHead(up.statusCode||200,headers);
        res.end(out);
      } else {
        headers['content-length']=String(buf.length);
        res.writeHead(up.statusCode||200,headers);
        res.end(buf);
      }
    });
  });
  upstream.on('error',err=>{
    res.writeHead(502,{'content-type':'text/plain; charset=utf-8'});
    res.end('TWLF upstream unavailable');
  });
  req.pipe(upstream);
}

const server=http.createServer((req,res)=>{
  if(req.url==='/health'){
    res.writeHead(200,{'content-type':'application/json'});
    return res.end(JSON.stringify({ok:true,service:'twlf-forum-proxy',source:'twlfworldhq.wordpress.com'}));
  }
  return proxy(req,res);
});
server.listen(PORT,'0.0.0.0',()=>console.log(`TWLF forum proxy listening on :${PORT}`));
