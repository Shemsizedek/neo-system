// NEO-TERMINAL-006: non-custodial, review-only Counterpay/NEOpay handoff.
// No browser secrets, automatic signing, broadcast, or executable USD market claims.
export const NOMNI='NOMNI';
export const USD='USD';
export function parsePositive(value){
 if(typeof value!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value))throw Error('Enter a positive decimal amount (up to 8 places).');
 const n=Number(value);if(!Number.isFinite(n)||n<=0)throw Error('Amount must be greater than zero');return n;
}
export function reviewIntent({side,base=NOMNI,quote=USD,amount,limitPrice,settlementInstrument}){
 if(!['BUY','SELL'].includes(side))throw Error('Choose BUY or SELL');
 if(base!==NOMNI||quote!==USD)throw Error('This review adapter supports NOMNI/USD only');
 const quantity=parsePositive(amount),price=parsePositive(limitPrice);
 if(!settlementInstrument||settlementInstrument!=='UNVERIFIED')throw Error('Settlement status must remain unverified until independently certified');
 const notional=quantity*price;
 if(!Number.isFinite(notional))throw Error('Invalid notional');
 return Object.freeze({kind:'NEO_TERMINAL_REVIEW_INTENT',version:1,market:'NOMNI/USD',side,quantityNomni:quantity,limitUsdPerNomni:price,indicativeUsdNotional:notional,usdSettlement:'UNVERIFIED',executable:false,signingEnabled:false,broadcastEnabled:false,requiredNextStep:'OPEN_NEOPAY_FOR_INDEPENDENT_WALLET_REVIEW'});
}
export function liquidityAssessment({orders=[],usdInstrumentVerified=false,entitledVenue=false}={}){
 const matching=orders.filter(o=>o&&o.giveAsset&&o.getAsset&&['NOMNI','USD'].includes(o.giveAsset)&&['NOMNI','USD'].includes(o.getAsset)&&o.giveAsset!==o.getAsset);
 const valid=matching.filter(o=>typeof o.txHash==='string'&&/^[a-f0-9]{64}$/i.test(o.txHash)&&Number(o.giveRemaining)>0&&Number(o.getRemaining)>0);
 return {observedOrders:matching.length,identityCheckedOrders:valid.length,usdInstrumentVerified:usdInstrumentVerified===true,entitledVenue:entitledVenue===true,certified:false,executable:false,reason:'Observed orders do not prove available liquidity, dollar redemption, counterparty performance, or authorized trading.'};
}
export const NEOPAY_REVIEW_ROUTE='../#/neopay';
