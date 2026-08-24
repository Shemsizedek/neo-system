import type { MerchantOpsState } from './types';

export const MERCHANT_OPS_KEY='neo-counter-merchant-ops-v1';

export const defaultMerchantOps:MerchantOpsState={
  merchant:{id:'merchant_144',name:'NEO Merchant #144',legalName:'NEO Merchant',supportEmail:'',phone:'',currency:'USD',timezone:'America/Chicago'},
  locations:[{id:'loc_main',name:'Main Location',address:'',taxRuleId:'tax_standard',terminalIds:['neo-terminal-demo-01']}],
  taxRules:[{id:'tax_standard',name:'Standard Sales Tax',rate:0.0825,inclusive:false,enabled:true}],
  catalog:[
    {id:'p1',name:'NEO Membership',price:14400,category:'Services',sku:'NEO-MEM-144',barcode:'144000000001',inventoryTracked:false,quantity:999,active:true},
    {id:'p2',name:'Consultation',price:28800,category:'Services',sku:'NEO-CON-288',barcode:'144000000002',inventoryTracked:false,quantity:999,active:true},
    {id:'p3',name:'NEO Market Kit',price:7200,category:'Retail',sku:'NEO-KIT-072',barcode:'144000000003',inventoryTracked:true,quantity:24,active:true},
    {id:'p4',name:'Digital Access Pass',price:3600,category:'Digital',sku:'NEO-DIG-036',barcode:'144000000004',inventoryTracked:false,quantity:999,active:true}
  ],
  receiptTemplates:[{id:'receipt_default',name:'Default Receipt',header:'NEO Counter',footer:'Thank you for supporting the Bitcoin Commerce Network.',showLocation:true,showTaxBreakdown:true}],
  terminalAssignments:[{terminalId:'neo-terminal-demo-01',locationId:'loc_main',label:'Front Counter',enabled:true}],
  staff:[
    {id:'staff_owner',name:'Owner',role:'owner',permissions:['register','refunds','catalog','devices','reports','settings'],active:true},
    {id:'staff_cashier',name:'Cashier',role:'cashier',permissions:['register'],active:true}
  ],
  activeLocationId:'loc_main',
  activeReceiptTemplateId:'receipt_default'
};

export function loadMerchantOps():MerchantOpsState{
  try{const raw=localStorage.getItem(MERCHANT_OPS_KEY);return raw?JSON.parse(raw) as MerchantOpsState:defaultMerchantOps;}catch{return defaultMerchantOps;}
}

export function saveMerchantOps(state:MerchantOpsState){localStorage.setItem(MERCHANT_OPS_KEY,JSON.stringify(state));}
