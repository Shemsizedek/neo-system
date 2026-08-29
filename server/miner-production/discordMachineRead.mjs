import crypto from 'node:crypto'

export const DISCORD_MACHINE_READ_PATH='/discord/snapshot'

function normalizeBearer(value){
  const raw=String(value||'').trim()
  return raw.toLowerCase().startsWith('bearer ')?raw.slice(7).trim():''
}

export function bearerTokenMatches(headerValue,expectedToken){
  const supplied=Buffer.from(normalizeBearer(headerValue))
  const expected=Buffer.from(String(expectedToken||'').trim())
  if(!expected.length||supplied.length!==expected.length)return false
  return crypto.timingSafeEqual(supplied,expected)
}

export function isDiscordMachineReadRequest(req,expectedToken){
  return req?.method==='GET'&&req?.url===DISCORD_MACHINE_READ_PATH&&bearerTokenMatches(req?.headers?.authorization,expectedToken)
}
