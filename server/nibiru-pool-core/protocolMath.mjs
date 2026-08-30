const POW10=n=>10n**BigInt(n)

function expandScientific(value){
  const text=String(value).trim().toLowerCase()
  const match=text.match(/^([+]?(?:\d+)(?:\.\d+)?)[e]([+-]?\d+)$/)
  if(!match)return text
  const [,mantissa,expText]=match
  const exponent=Number(expText)
  if(!Number.isSafeInteger(exponent))throw new Error('INVALID_DIFFICULTY')
  const [whole,fraction='']=mantissa.split('.')
  const digits=whole+fraction
  const decimalIndex=whole.length+exponent
  if(decimalIndex<=0)return `0.${'0'.repeat(-decimalIndex)}${digits}`
  if(decimalIndex>=digits.length)return `${digits}${'0'.repeat(decimalIndex-digits.length)}`
  return `${digits.slice(0,decimalIndex)}.${digits.slice(decimalIndex)}`
}

export function decimalRatio(value){
  const expanded=expandScientific(value)
  if(!/^\+?\d+(?:\.\d+)?$/.test(expanded))throw new Error('INVALID_DIFFICULTY')
  const normalized=expanded.replace(/^\+/,'')
  const [whole,fraction='']=normalized.split('.')
  const denominator=POW10(fraction.length)
  const numerator=BigInt(`${whole}${fraction}`)
  if(numerator<=0n)throw new Error('INVALID_DIFFICULTY')
  return Object.freeze({numerator,denominator})
}

export function divideTargetByDifficulty(target,difficulty){
  if(typeof target!=='bigint'||target<=0n)throw new Error('INVALID_TARGET')
  const {numerator,denominator}=decimalRatio(difficulty)
  const result=(target*denominator)/numerator
  return result>0n?result:1n
}

export function targetFromCompactBits(bits){
  if(typeof bits!=='string'||!/^[0-9a-f]{8}$/i.test(bits))throw new Error('INVALID_BITS')
  const compact=Number.parseInt(bits,16)
  const exponent=(compact>>>24)&0xff
  const mantissa=compact&0x007fffff
  const negative=Boolean(compact&0x00800000)
  if(negative||mantissa===0)throw new Error('INVALID_BITS')
  const coefficient=BigInt(mantissa)
  return exponent<=3?coefficient>>BigInt(8*(3-exponent)):coefficient<<BigInt(8*(exponent-3))
}
