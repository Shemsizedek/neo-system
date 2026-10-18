import tls from 'node:tls';

/** Network-only TLS probe: no login, no message access. */
export function probeTitanTls(host='imap.titan.email', timeoutMs=8000) {
  if (!/^([a-z0-9-]+\.)+titan\.email$/i.test(host)) return Promise.resolve({ok:false,reason:'invalid_host'});
  return new Promise(resolve => {
    let done=false;
    const finish=result => {if(done)return;done=true;socket.destroy();resolve(result);};
    const socket=tls.connect({host,port:993,servername:host,rejectUnauthorized:true});
    socket.setTimeout(timeoutMs);
    socket.once('secureConnect',()=>finish({ok:true,tlsAuthorized:socket.authorized}));
    socket.once('timeout',()=>finish({ok:false,reason:'timeout'}));
    socket.once('error',error=> {
      const code=String(error?.code||'');
      const reason=['ENOTFOUND','EAI_AGAIN'].includes(code)?'dns':['ECONNREFUSED','ENETUNREACH','EHOSTUNREACH'].includes(code)?'network':code.startsWith('ERR_TLS')||code.includes('CERT')?'tls_validation':'transport';
      finish({ok:false,reason});
    });
  });
}

/** Classify server's initial IMAP banner, without credentials or raw banner logging. */
export function probeTitanGreeting(host='imap.titan.email', timeoutMs=8000) {
  if (!/^([a-z0-9-]+\.)+titan\.email$/i.test(host)) return Promise.resolve({ok:false,reason:'invalid_host'});
  return new Promise(resolve=>{
    let done=false, buffer='';
    const socket=tls.connect({host,port:993,servername:host,rejectUnauthorized:true});
    const finish=x=>{if(done)return;done=true;socket.destroy();resolve(x);};
    socket.setTimeout(timeoutMs);
    socket.once('secureConnect',()=>{});
    socket.on('data',chunk=>{
      buffer+=chunk.toString('utf8').slice(0,512);
      if(buffer.length>1024)return finish({ok:false,reason:'oversized_greeting'});
      if(!buffer.includes('\r\n'))return;
      const banner=buffer.split('\r\n',1)[0];
      return finish(/^\* OK(?:\s|$)/i.test(banner)?{ok:true,kind:'imap_ok'}:/^\* PREAUTH(?:\s|$)/i.test(banner)?{ok:true,kind:'imap_preauth'}:/^\* BYE(?:\s|$)/i.test(banner)?{ok:false,reason:'imap_bye'}:{ok:false,reason:'unexpected_greeting'});
    });
    socket.once('timeout',()=>finish({ok:false,reason:'greeting_timeout'}));
    socket.once('error',()=>finish({ok:false,reason:'greeting_transport_error'}));
    socket.once('end',()=>finish({ok:false,reason:'closed_before_greeting'}));
  });
}
