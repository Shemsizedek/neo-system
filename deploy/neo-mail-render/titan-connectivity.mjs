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
