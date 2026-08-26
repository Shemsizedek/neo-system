import{contactByAddress}from'./contactIntelligence'

export type SendIntent={destination:string;asset?:string;amount?:string;label?:string;cesAccount?:string;memo?:string}

function setReactInput(input:HTMLInputElement,value:string){
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set
 setter?.call(input,value)
 input.dispatchEvent(new Event('input',{bubbles:true}))
 input.dispatchEvent(new Event('change',{bubbles:true}))
}

export function openUnifiedSend(intent:SendIntent){
 if(typeof document==='undefined')return
 const buttons=[...document.querySelectorAll<HTMLButtonElement>('.wallet-nav button')]
 const sendButton=buttons.find(b=>b.textContent?.trim().toLowerCase()==='send')
 sendButton?.click()
 window.setTimeout(()=>{
  const labels=[...document.querySelectorAll<HTMLLabelElement>('.wallet-main label')]
  const field=(name:string)=>labels.find(l=>l.textContent?.toLowerCase().startsWith(name))?.querySelector('input') as HTMLInputElement|null
  const destination=field('destination'),asset=field('asset'),amount=field('amount')
  if(destination)setReactInput(destination,intent.destination)
  if(asset&&intent.asset)setReactInput(asset,intent.asset.toUpperCase())
  if(amount&&intent.amount)setReactInput(amount,intent.amount)
  destination?.focus()
 },40)
}

export function enrichSendIntent(destination:string):SendIntent{
 const contact=contactByAddress(destination)
 return{destination,label:contact?.name,cesAccount:contact?.cesAccount,memo:contact?.note}
}
