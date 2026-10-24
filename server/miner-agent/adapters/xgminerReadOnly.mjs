import net from 'node:net';

const COMMANDS=new Set(['version','summary','devs','devdetails','pools']);
const plain=value=>value!==null && typeof value==='object' && !Array.isArray(value);
const fail=code=>{throw Error(code);};
const number=value=>typeof value==='number' && Number.isFinite(value) && value>=0 ? value : null;
const count=value=>Number.isSafeInteger(value) && value>=0 ? value : null;

/** CGMiner/BFGMiner native JSON-over-TCP read protocol, NOT HTTP JSON-RPC 2.0.
 * Loopback only: use a separately authorized local tunnel for remote hardware.
 * This collector neither launches a miner nor grants production capacity authority.
 */
export function createXgminerReadOnlyClient({enabled=false,operatorConsent=false,
  host='127.0.0.1',port=4028,timeoutMs=2500,maxBytes=262144}={}) {
  if (enabled!==true || operatorConsent!==true) fail('XGMINER_EXPLICIT_OPT_IN_REQUIRED');
  if (!['127.0.0.1','::1'].includes(host) || !Number.isInteger(port) || port<1 || port>65535) fail('XGMINER_LOOPBACK_ENDPOINT_REQUIRED');
  if (!Number.isInteger(timeoutMs) || timeoutMs<50 || timeoutMs>5000 ||
      !Number.isInteger(maxBytes) || maxBytes<128 || maxBytes>1048576) fail('XGMINER_BOUNDS_INVALID');
  async function query(command) {
    if (!COMMANDS.has(command)) fail('XGMINER_READ_COMMAND_DENIED');
    return new Promise((resolve,reject)=>{
      let socket,done=false,size=0;const chunks=[];
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);socket?.destroy();error?reject(error):resolve(value);};
      const parse=()=>{
        let body;
        try {body=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/\0+$/,''));}
        catch {return finish(Error('XGMINER_RESPONSE_INVALID'));}
        if (!plain(body) || !Array.isArray(body.STATUS) || !body.STATUS.length ||
            body.STATUS.some(s=>!plain(s)||s.STATUS!=='S')) return finish(Error('XGMINER_API_NOT_SUCCESSFUL'));
        finish(null,body);
      };
      const timer=setTimeout(()=>finish(Error('XGMINER_REQUEST_TIMEOUT')),timeoutMs);
      try {socket=net.createConnection({host,port});}
      catch {return finish(Error('XGMINER_CONNECTION_FAILED'));}
      socket.once('connect',()=>socket.write(JSON.stringify({command})));
      socket.on('data',chunk=>{
        size+=chunk.length;if(size>maxBytes)return finish(Error('XGMINER_RESPONSE_TOO_LARGE'));
        chunks.push(chunk);
        if(chunk.includes(0))parse();
      });
      socket.once('end',parse);
      socket.once('error',()=>finish(Error('XGMINER_CONNECTION_FAILED')));
      socket.once('close',()=>{if(!done)finish(Error('XGMINER_RESPONSE_INCOMPLETE'));});
    });
  }
  return Object.freeze({query,readTelemetry:async()=>{
    const [version,summary,devices,pools]=await Promise.all(['version','summary','devs','pools'].map(query));
    const v=version.VERSION?.[0],s=summary.SUMMARY?.[0];
    if (!plain(v) || !plain(s) || !Array.isArray(devices.DEVS) || !Array.isArray(pools.POOLS)) fail('XGMINER_REPORT_SHAPE_INVALID');
    const source=typeof v.CGMiner==='string'?'CGMINER':typeof v.BFGMiner==='string'?'BFGMINER':null;
    if (!source) fail('XGMINER_ENGINE_UNRECOGNIZED');
    const field=['GHS 5s','MHS 5s','GHS av','MHS av'].find(k=>number(s[k])!==null);
    const temps=devices.DEVS.map(d=>number(d?.Temperature)).filter(t=>t!==null && t>0);
    return {source,observedAt:new Date().toISOString(),evidenceClass:'UNATTESTED_LOCAL_API_OBSERVATION',
      reportedHashrateTh:field?s[field]/(field.startsWith('GHS')?1000:1000000):null,
      hashrateField:field||null,powerW:null,temperatureC:temps.length?Math.max(...temps):null,
      reportedAcceptedShares:count(s.Accepted),reportedRejectedShares:count(s.Rejected),
      poolReportsAlive:pools.POOLS.some(p=>p?.Status==='Alive'),
      hardwareVerified:false,acceptedSharesVerified:false,contractCapacityEligible:false,
      purchasesEnabled:false,settlementEnabled:false};
  }});
}
