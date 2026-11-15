#!/usr/bin/env node
// NEO-MULTICLOUD-014: operator-driven fresh test correlation over one bounded
// HTTP request to the previously approved rootless NetBird pilot.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {isNetBirdPeerIPv4, TARGET_PORT, TARGET_PATH} from './multicloud-005-android-transaction.mjs';

export const CHALLENGE_RE=/^[0-9a-f]{32}$/;
const SCHEMA='neo.multicloud.014.challenge-transaction.v1';

export function parseArgs(args) {
  const value=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined;};
  const ip=value('--peer-ip'),challenge=value('--expected-challenge');
  if(args.length!==4 || !isNetBirdPeerIPv4(ip) ||
     typeof challenge!=='string' || !CHALLENGE_RE.test(challenge)) {
    throw new TypeError('INVALID_PRIVATE_TEST_ARGUMENTS');
  }
  return {ip,challenge};
}

export function validateResponse(body,expectedChallenge) {
  if(!CHALLENGE_RE.test(expectedChallenge) || !body || typeof body!=='object' ||
    Array.isArray(body)) return 'INVALID_RESPONSE';
  const valid=body.gate==='NEO-MULTICLOUD-002' &&
    body.response==='PRIVATE_APPLICATION_RESPONSE' &&
    body.challenge===expectedChallenge &&
    body.private_tunnel_verified===false &&
    body.gateway_production_verified===false;
  return valid?'CHALLENGE_CORRELATED_PRIVATE_HTTP_RESPONSE':'CHALLENGE_OR_RESPONSE_MISMATCH';
}

export function requestChallenge(ip,challenge,{request=http.request,timeoutMs=8000}={}) {
  if(!isNetBirdPeerIPv4(ip) || !CHALLENGE_RE.test(challenge)) {
    return Promise.resolve('HOLD_INVALID_TARGET_OR_CHALLENGE');
  }
  return new Promise(done=>{
    let settled=false,client=null;
    const finish=status=>{
      if(settled)return; settled=true;
      try{client?.destroy();}catch{}
      done(status);
    };
    try {
      client=request({
        hostname:ip,port:TARGET_PORT,path:TARGET_PATH,method:'GET',
        timeout:timeoutMs,
        headers:{accept:'application/json','cache-control':'no-store'},
      },res=>{
        if(res.statusCode!==200){res.resume();finish('HOLD_NON_200_RESPONSE');return;}
        const chunks=[];
        let len=0;
        res.on('data',data=>{
          const chunk=Buffer.from(data);
          len+=chunk.length;
          if(len>4096){finish('HOLD_OVERSIZED_RESPONSE');return;}
          chunks.push(chunk);
        });
        res.once('end',()=>{
          if(settled)return;
          try {
            const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));
            finish(validateResponse(parsed,challenge));
          }catch{finish('HOLD_UNREADABLE_RESPONSE');}
        });
        res.once('error',()=>finish('HOLD_NETWORK_ERROR'));
      });
      client.once('error',()=>finish('HOLD_NETWORK_ERROR'));
      client.once('timeout',()=>finish('HOLD_TIMEOUT'));
      client.end();
    } catch {finish('HOLD_NETWORK_ERROR');}
  });
}

export async function observe(ip,challenge,options={}) {
  const result=await requestChallenge(ip,challenge,options);
  return {
    schema:SCHEMA,
    source:'LOCAL_ANDROID_OPERATOR_RUN',
    observed_at:(options.now??(()=>new Date().toISOString()))(),
    application_result:result,
    unique_current_test_response_correlated:result==='CHALLENGE_CORRELATED_PRIVATE_HTTP_RESPONSE',
    exact_wireguard_peer_handshake_independently_verified:false,
    default_all_to_all_policy_disabled_verified:false,
    unauthorized_peer_denial_verified:false,
    peer_revocation_verified:false,
    cellular_failover_verified:false,
    production_authorized:false,
  };
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  let args;
  try{args=parseArgs(process.argv.slice(2));}
  catch {
    process.stderr.write('Usage: node multicloud-014-challenge-client.mjs --peer-ip CODESPACE_NETBIRD_IP --expected-challenge NON_SECRET_TEST_CHALLENGE\n');
    process.exitCode=2;
  }
  if(args){
    const report=await observe(args.ip,args.challenge);
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(!report.unique_current_test_response_correlated)process.exitCode=2;
  }
}
