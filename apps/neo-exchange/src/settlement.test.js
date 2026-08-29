import {describe,it,expect,vi} from 'vitest';
import {readExchangeSettlement} from './settlement.js';

describe('NEO Exchange settlement consumer',()=>{
 it('blocks redirects without a confirmed reference',()=>{
   const result=readExchangeSettlement('?settlement_state=SETTLED&settlement_confirmed=0&payment_id=p1');
   expect(result.fulfillmentEligible).toBe(false);
 });
 it('only advances confirmed settled references to verification',()=>{
   const result=readExchangeSettlement('?settlement_state=SETTLED&settlement_confirmed=1&payment_id=p1&reference=abc123');
   expect(result.fulfillmentEligible).toBe(true);
   expect(result.reference).toBe('abc123');
 });
});
