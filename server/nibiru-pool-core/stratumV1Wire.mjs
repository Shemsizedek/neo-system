export function stratumPrevhashFromBlockHash(blockHash){
  if(typeof blockHash!=='string'||!/^[0-9a-f]{64}$/i.test(blockHash))throw new Error('INVALID_BLOCK_HASH')
  return Buffer.from(blockHash,'hex').reverse().toString('hex')
}

export function blockHashFromStratumPrevhash(prevhash){
  if(typeof prevhash!=='string'||!/^[0-9a-f]{64}$/i.test(prevhash))throw new Error('INVALID_STRATUM_PREVHASH')
  return Buffer.from(prevhash,'hex').reverse().toString('hex')
}

export function stripExtranonce1FromCoinbase1(coinbase1Hex,extranonce1){
  if(typeof coinbase1Hex!=='string'||!/^[0-9a-f]+$/i.test(coinbase1Hex)||coinbase1Hex.length%2)throw new Error('INVALID_COINBASE1')
  if(typeof extranonce1!=='string'||!/^[0-9a-f]+$/i.test(extranonce1)||extranonce1.length%2)throw new Error('INVALID_EXTRANONCE1')
  if(!coinbase1Hex.toLowerCase().endsWith(extranonce1.toLowerCase()))throw new Error('COINBASE1_EXTRANONCE1_MISMATCH')
  return coinbase1Hex.slice(0,-extranonce1.length)
}

export function reconstructStratumCoinbase({coinbase1,extranonce1,extranonce2,coinbase2}={}){
  for(const [name,value] of Object.entries({coinbase1,extranonce1,extranonce2,coinbase2})){
    if(typeof value!=='string'||!/^[0-9a-f]*$/i.test(value)||value.length%2)throw new Error(`INVALID_${name.toUpperCase()}`)
  }
  return `${coinbase1}${extranonce1}${extranonce2}${coinbase2}`.toLowerCase()
}
