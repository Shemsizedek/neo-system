function safe(value,fallback='unknown'){
  const text=String(value??'').trim()
  return text||fallback
}

function canonical(entry){
  return JSON.stringify({
    version:1,
    event:'neo.discord.operator_read',
    actorId:safe(entry.actorId),
    guildId:safe(entry.guildId,'none'),
    service:safe(entry.service),
    action:'operator-read',
    outcome:safe(entry.outcome),
    correlationId:safe(entry.correlationId,'none'),
    at:safe(entry.at)
  })
}

function hex(buffer){return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('')}

export async function createOperatorAuditReceipt(entry,{cryptoImpl=globalThis.crypto}={}){
  if(!cryptoImpl?.subtle?.digest)throw new Error('WEB_CRYPTO_REQUIRED')
  const record=JSON.parse(canonical(entry))
  const digest=hex(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(record))))
  return {
    ...record,
    digest:`sha256:${digest}`,
    receiptId:`neo-audit-${digest.slice(0,24)}`,
    sensitiveDataIncluded:false,
    protectedPayloadIncluded:false
  }
}

export function emitOperatorAuditReceipt(receipt,{logger=console}={}){
  logger.info(JSON.stringify({...receipt,receipt:true}))
  return receipt
}
