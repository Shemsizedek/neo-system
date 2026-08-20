import type {Currency, Miner, MiningContract} from './types'

export const miners: Miner[] = [
  {id:'NEO-MINER-TX-000001',farm:'Lone Star Alpha',facility:'Houston A',model:'ORIGIN Reference 120T',hashrateTh:119.8,powerW:3340,tempC:67,efficiencyJTh:27.9,uptimePct:99.98,status:'MINING',pool:'NEO Pool Primary'},
  {id:'NEO-MINER-TX-000002',farm:'Lone Star Alpha',facility:'Houston A',model:'ORIGIN Reference 120T',hashrateTh:121.1,powerW:3365,tempC:69,efficiencyJTh:27.8,uptimePct:99.91,status:'MINING',pool:'NEO Pool Primary'},
  {id:'NEO-MINER-TX-000003',farm:'Lone Star Alpha',facility:'Houston A',model:'ORIGIN Reference 120T',hashrateTh:96.4,powerW:3310,tempC:78,efficiencyJTh:34.3,uptimePct:98.72,status:'WARNING',pool:'NEO Pool Primary'},
  {id:'NEO-MINER-AZ-000004',farm:'Desert Beta',facility:'Phoenix B',model:'ORIGIN Reference 110T',hashrateTh:109.5,powerW:3140,tempC:64,efficiencyJTh:28.7,uptimePct:99.77,status:'MINING',pool:'NEO Pool Secondary'},
  {id:'NEO-MINER-AZ-000005',farm:'Desert Beta',facility:'Phoenix B',model:'ORIGIN Reference 110T',hashrateTh:0,powerW:110,tempC:38,efficiencyJTh:0,uptimePct:94.02,status:'OFFLINE',pool:'NEO Pool Secondary'},
  {id:'NEO-MINER-GA-000006',farm:'Peach Gamma',facility:'Atlanta C',model:'ORIGIN Reference 120T',hashrateTh:118.9,powerW:3295,tempC:66,efficiencyJTh:27.7,uptimePct:99.84,status:'MINING',pool:'NEO Pool Primary'}
]

export const currencies: Currency[] = [
  {code:'USD',name:'US Dollar',kind:'FIAT',region:'United States',payment:true,settlement:true,fx:true,status:'SUPPORTED'},
  {code:'EUR',name:'Euro',kind:'FIAT',region:'Euro Area',payment:true,settlement:true,fx:true,status:'SUPPORTED'},
  {code:'GBP',name:'Pound Sterling',kind:'FIAT',region:'United Kingdom',payment:true,settlement:true,fx:true,status:'SUPPORTED'},
  {code:'JPY',name:'Japanese Yen',kind:'FIAT',region:'Japan',payment:true,settlement:false,fx:true,status:'SUPPORTED'},
  {code:'CAD',name:'Canadian Dollar',kind:'FIAT',region:'Canada',payment:true,settlement:false,fx:true,status:'SUPPORTED'},
  {code:'BTC',name:'Bitcoin',kind:'DIGITAL',region:'Global',payment:true,settlement:true,fx:true,status:'SUPPORTED'},
  {code:'XCP',name:'Counterparty',kind:'DIGITAL',region:'Bitcoin',payment:true,settlement:false,fx:true,status:'PENDING'},
  {code:'NOMNI',name:'NOMNI',kind:'WORLD_CURRENCY',region:'NEO / Counterparty',payment:false,settlement:false,fx:false,status:'REFERENCE_ONLY'}
]

export const contracts: MiningContract[] = [
  {id:'NMC-260819-001',customer:'Demo Enterprise A',hashrateTh:500,termMonths:12,paymentCurrency:'USD',amount:24000,status:'ACTIVE',estimatedBtc:0.0862},
  {id:'NMC-260819-002',customer:'Demo Customer B',hashrateTh:120,termMonths:6,paymentCurrency:'EUR',amount:5350,status:'PAYMENT_PENDING',estimatedBtc:0.0103},
  {id:'NMC-260819-003',customer:'Demo Customer C',hashrateTh:250,termMonths:12,paymentCurrency:'BTC',amount:0.182,status:'ACTIVE',estimatedBtc:0.0431}
]
