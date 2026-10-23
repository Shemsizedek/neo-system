import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceStore} from './commerce.mjs';

test('merchant catalog derives order subtotal from stored item prices',()=>{const store=createCommerceStore();const catalog=store.upsertCatalog({merchantId:'merchant-1',type:'RESTAURANT',name:'Menu'});const item=store.addItem({catalogId:catalog.id,name:'Meal',unitPriceWorld:12.5});const order=store.createOrder({customerId:'customer-1',merchantId:'merchant-1',lines:[{itemId:item.id,quantity:2,unitPriceWorld:0.01}]});assert.equal(order.subtotalWorld,25);assert.equal(order.lines[0].unitPriceWorld,12.5);assert.equal(order.state,'PLACED');});

test('order cannot mix items from another merchant',()=>{const store=createCommerceStore();const a=store.upsertCatalog({merchantId:'merchant-a',type:'GROCERY',name:'A'});const item=store.addItem({catalogId:a.id,name:'Milk',unitPriceWorld:4});assert.throws(()=>store.createOrder({customerId:'c',merchantId:'merchant-b',lines:[{itemId:item.id,quantity:1}]}),/item_merchant_mismatch/);});

test('unavailable inventory cannot be ordered',()=>{const store=createCommerceStore();const catalog=store.upsertCatalog({merchantId:'m',type:'RETAIL',name:'Shop'});const item=store.addItem({catalogId:catalog.id,name:'Item',unitPriceWorld:8,available:false});assert.throws(()=>store.createOrder({customerId:'c',merchantId:'m',lines:[{itemId:item.id}]}),/item_unavailable/);});
