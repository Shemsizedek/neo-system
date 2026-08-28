export type TelegramKind='TEXT'|'PAYMENT_REQUEST'|'INVOICE'|'ROUTE'
export type NeoTelegram={version:'NWT-1';id:string;kind:TelegramKind;from:string;to:string;createdAt:string;body:string;amount?:number;currency?:string;settlementRail?:string;signature?:string;status:'DRAFT'|'SIGNED'|'QUEUED'}

export function createTelegram(input:{kind:TelegramKind;from:string;to:string;body:string;amount?:number;currency?:string;settlementRail?:string}):NeoTelegram{
  return {version:'NWT-1',id:`NWT-${Date.now().toString(36).toUpperCase()}`,createdAt:new Date().toISOString(),status:'DRAFT',...input}
}
export function serializeTelegram(message:NeoTelegram){return JSON.stringify(message)}
export function telegramDigestInput(message:NeoTelegram){
  const {signature,...unsigned}=message;return JSON.stringify(unsigned)
}
