import React,{useMemo} from 'react';
import {readExchangeSettlement} from './settlement.js';

export function SettlementStatus(){
 const result=useMemo(()=>readExchangeSettlement(),[]);
 if(!result)return null;
 return <div className="review-box">
   <span>Returned state</span><b>{result.state}</b>
   <span>Reference</span><b>{result.reference||'none'}</b>
   <span>Fulfillment</span><b>{result.fulfillmentEligible?'VERIFY REFERENCE':'BLOCKED'}</b>
   <small>A browser return is not payment proof. Independently verify the blockchain reference, amount, asset, destination and confirmation policy before fulfillment.</small>
 </div>;
}
