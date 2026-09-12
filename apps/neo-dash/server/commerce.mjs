import { randomUUID } from 'node:crypto';

export const COMMERCE_TYPES=new Set(['RESTAURANT','GROCERY','RETAIL']);
const ORDER_STATES=new Set(['CART','PLACED','MERCHANT_ACCEPTED','PREPARING','READY_FOR_PICKUP','FULFILLING','DELIVERED','CANCELLED']);

export function createCommerceStore(){
  const catalogs=new Map(),items=new Map(),orders=new Map();
  const clone=value=>value==null?value:structuredClone(value);
  return {
    upsertCatalog({merchantId,type,name}){if(!merchantId||!COMMERCE_TYPES.has(type))throw new Error('invalid_catalog');const current=[...catalogs.values()].find(x=>x.merchantId===merchantId&&x.type===type);const value=current||{id:randomUUID(),merchantId,type,createdAt:new Date().toISOString()};Object.assign(value,{name:String(name||type),updatedAt:new Date().toISOString()});catalogs.set(value.id,value);return clone(value);},
    listCatalogs(merchantId){return [...catalogs.values()].filter(x=>!merchantId||x.merchantId===merchantId).map(clone);},
    addItem({catalogId,name,unitPriceWorld,available=true,metadata={}}){if(!catalogs.has(catalogId)||!name||!Number.isFinite(Number(unitPriceWorld))||Number(unitPriceWorld)<0)throw new Error('invalid_catalog_item');const value={id:randomUUID(),catalogId,name:String(name),unitPriceWorld:Number(unitPriceWorld),available:Boolean(available),metadata:{...metadata},createdAt:new Date().toISOString()};items.set(value.id,value);return clone(value);},
    listItems(catalogId){return [...items.values()].filter(x=>x.catalogId===catalogId).map(clone);},
    createOrder({customerId,merchantId,lines=[]}){if(!customerId||!merchantId||!Array.isArray(lines)||!lines.length)throw new Error('invalid_order');let subtotalWorld=0;const normalized=lines.map(line=>{const item=items.get(line.itemId);const quantity=Math.max(1,Math.trunc(Number(line.quantity)||1));if(!item||!item.available)throw new Error('item_unavailable');const catalogsForMerchant=[...catalogs.values()].some(c=>c.id===item.catalogId&&c.merchantId===merchantId);if(!catalogsForMerchant)throw new Error('item_merchant_mismatch');const lineTotalWorld=Number((item.unitPriceWorld*quantity).toFixed(8));subtotalWorld+=lineTotalWorld;return {itemId:item.id,name:item.name,unitPriceWorld:item.unitPriceWorld,quantity,lineTotalWorld};});const value={id:randomUUID(),customerId,merchantId,lines:normalized,subtotalWorld:Number(subtotalWorld.toFixed(8)),state:'PLACED',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};orders.set(value.id,value);return clone(value);},
    getOrder(id){return clone(orders.get(id)||null);},
    listOrders({customerId,merchantId}={}){return [...orders.values()].filter(x=>(!customerId||x.customerId===customerId)&&(!merchantId||x.merchantId===merchantId)).map(clone);},
    transitionOrder(id,state){const order=orders.get(id);if(!order)return null;if(!ORDER_STATES.has(state))throw new Error('invalid_order_state');order.state=state;order.updatedAt=new Date().toISOString();return clone(order);}
  };
}
