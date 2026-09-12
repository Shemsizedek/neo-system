import assert from 'node:assert/strict';
import { clusterProperties, filterMarketFacets } from './market.js';
import type { PropertyRecord } from './server.js';

const base=(id:string,latitude:number,longitude:number,askingFiat:number,facts:Record<string,number>):PropertyRecord=>({id,listingType:'sale',propertyType:'house',status:'active',address:{line1:`${id} NEO Way`,city:'Houston',region:'TX',postalCode:'77002',country:'US',latitude,longitude},facts,pricing:{askingFiat,fiatCurrency:'USD'},authority:{claimStatus:'verified',verifiedAt:new Date().toISOString(),verificationMethod:'test'},neo:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});

const rows=[
  base('a',29.7604,-95.3698,500000,{beds:3,baths:2,units:1,capRatePct:5.2}),
  base('b',29.7606,-95.3697,750000,{beds:4,baths:3,units:1,capRatePct:6.1}),
  base('c',29.7800,-95.3900,6000000,{units:20,capRatePct:4.4})
];

assert.deepEqual(filterMarketFacets(rows,{minPrice:600000,maxPrice:1000000,minBeds:4}).map(r=>r.id),['b']);
assert.deepEqual(filterMarketFacets(rows,{minUnits:10,minCapRate:4}).map(r=>r.id),['c']);
const clusters=clusterProperties(rows,2);
assert.equal(clusters[0].count,2);
assert.deepEqual(new Set(clusters[0].propertyIds),new Set(['a','b']));
assert.equal(clusters.length,2);
console.log('NEO Realty market facets and clustering test passed');
