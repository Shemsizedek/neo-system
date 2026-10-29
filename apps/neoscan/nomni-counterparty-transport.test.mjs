import test from 'node:test';import assert from 'node:assert/strict';
import {createNomniCounterpartyTransport} from './nomni-counterparty-transport.mjs';
test('transport rejects rogue endpoints before DNS lookup',async()=>{
 let lookups=0;const f=createNomniCounterpartyTransport({lookup:async()=>{lookups++;return []}});
 await assert.rejects(()=>f('https://evil.example/v2/assets/NOMNI'),/endpoint_not_allowed/);
 await assert.rejects(()=>f('https://api.counterparty.io:4000/v2/assets/BTC'),/endpoint_not_allowed/);
 await assert.rejects(()=>f('https://api.counterparty.io:4000/v2/assets/NOMNI/orders?limit=100'),/query_not_allowed/);
 assert.equal(lookups,0);
});
test('private DNS result is rejected',async()=>{
 const f=createNomniCounterpartyTransport({lookup:async()=>[{address:'127.0.0.1',family:4}]});
 await assert.rejects(()=>f('https://api.counterparty.io:4000/v2/assets/NOMNI'),/unsafe_dns_resolution/);
});
