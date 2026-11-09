#!/usr/bin/env node
// NET-008 observe-only. Never enrolls peers, creates policies or changes cloud networking.
import { evaluatePilotReadiness, failClosedPilotReport } from './netbird-pilot-audit.mjs';

const token=process.env.NETBIRD_PAT;
const base='https://api.netbird.io';
const stdout=report=>process.stdout.write(JSON.stringify(report,null,2)+'\n');

async function listResource(path) {
  const res=await fetch(base+path,{
    method:'GET',
    headers:{Authorization:'Token '+token,Accept:'application/json'},
    signal:AbortSignal.timeout(12000),
    redirect:'error'
  });
  if (!res.ok) {
    if (res.status===401 || res.status===403) throw new Error('NETBIRD_API_AUTH_FAILED');
    if (res.status===429) throw new Error('NETBIRD_API_RATE_LIMITED');
    if (res.status>=500) throw new Error('NETBIRD_API_UNAVAILABLE');
    throw new Error('NETBIRD_API_READ_FAILED');
  }
  const response=await res.json();
  if (!Array.isArray(response)) throw new Error('NETBIRD_API_UNEXPECTED_RESPONSE');
  return response;
}

if (!token) {
  stdout(failClosedPilotReport('NETBIRD_PAT_NOT_CONFIGURED'));
  process.exitCode=2;
} else {
  try {
    const [peers,policies]=await Promise.all([
      listResource('/api/peers'),
      listResource('/api/policies')
    ]);
    stdout(evaluatePilotReadiness({peers,policies}));
  } catch(e) {
    // Do not log exceptions, headers, raw API response, peer names, IPs, keys, or PAT.
    const known=new Set(['NETBIRD_API_AUTH_FAILED','NETBIRD_API_RATE_LIMITED',
      'NETBIRD_API_UNAVAILABLE','NETBIRD_API_READ_FAILED','NETBIRD_API_UNEXPECTED_RESPONSE']);
    stdout(failClosedPilotReport(known.has(e.message)?e.message:'NETBIRD_API_UNVERIFIED'));
    process.exitCode=2;
  }
}
