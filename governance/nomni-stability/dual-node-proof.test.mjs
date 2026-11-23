import test from 'node:test';
import assert from 'node:assert/strict';
import {compareNomniCounterpartyNodes} from './dual-node-proof.mjs';
const h='1'.repeat(64),l='2'.repeat(64),m='3'.repeat(64),t='4'.repeat(64);
const snapshot={
 server:{result:{network:'mainnet',server_ready:true,ledger_state:'Following',counterparty_height:973747,backend_height:973747}},
 block:{result:{block_index:973747,block_hash:h,ledger_hash:l,messages_hash:m,txlist_hash:t}},
 asset:{result:{asset:'NOMNI',asset_id:'6195210',supply:'900000000',divisible:false,locked:true,owner:'owner',issuer:'issuer'}},
 audit:{outcome:'SINGLE_NODE_PROTOCOL_RECONCILED_NOT_INDEPENDENTLY_ATTESTED',verifiedNodeHeight:973747,reportedSupply:'900000000',
 holdingsSum:'900000000',issuanceQuantity:'900000000',documentedDestructions:'0',holderBalances:'894011631',openDispenserEscrow:'5988369'},
};
const clone=()=>structuredClone(snapshot);
test('same-block full ledger comparison never self-certifies operator independence',()=>{
 const r=compareNomniCounterpartyNodes(clone(),clone());
 assert.equal(r.twoConsistentNodeResponses,true);
 assert.equal(r.independentlyOperatedSecondNodeVerified,false);
 assert.equal(r.liveRedemptionAuthorized,false);
 assert.equal(r.height,973747);
});
test('rejects mismatched block, hashes, node readiness and supply/escrow',()=>{
 for (const mutation of [
 x=>{x.block.result.block_hash='a'.repeat(64)},
 x=>{x.block.result.ledger_hash='b'.repeat(64)},
 x=>{x.block.result.messages_hash='c'.repeat(64)},
 x=>{x.server.result.backend_height=973746},
 x=>{x.server.result.network='testnet'},
 x=>{x.asset.result.supply='800000000'},
 x=>{x.audit.openDispenserEscrow='0'},
 x=>{x.audit.verifiedNodeHeight=973746},
 x=>{x.block.result.block_index=973746},
 ]){const second=clone();mutation(second);assert.throws(()=>compareNomniCounterpartyNodes(clone(),second))}
});
