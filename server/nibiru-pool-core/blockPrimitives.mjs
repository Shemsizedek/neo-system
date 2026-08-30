import crypto from 'node:crypto'

const sha256=b=>crypto.createHash('sha256').update(b).digest()
export const dsha256=b=>sha256(sha256(b))
export const reverseHex=h=>Buffer.from(h,'hex').reverse().toString('hex')

export function varInt(n){
  const v=BigInt(n)
  if(v<0xfdn)return Buffer.from([Number(v)])
  if(v<=0xffffn){const b=Buffer.alloc(3);b[0]=0xfd;b.writeUInt16LE(Number(v),1);return b}
  if(v<=0xffffffffn){const b=Buffer.alloc(5);b[0]=0xfe;b.writeUInt32LE(Number(v),1);return b}
  const b=Buffer.alloc(9);b[0]=0xff;b.writeBigUInt64LE(v,1);return b
}

const u64=v=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(v));return b}

export function encodeScriptNum(value){
  let n=BigInt(value)
  if(n===0n)return Buffer.alloc(0)
  const out=[]
  while(n>0n){out.push(Number(n&0xffn));n>>=8n}
  if(out[out.length-1]&0x80)out.push(0)
  return Buffer.from(out)
}

export function bip34HeightPush(height){
  const n=encodeScriptNum(height)
  if(n.length>75)throw new Error('HEIGHT_SCRIPT_TOO_LARGE')
  return Buffer.concat([Buffer.from([n.length]),n])
}

function output(valueSats,scriptHex){
  if(!/^[0-9a-f]*$/i.test(scriptHex||''))throw new Error('INVALID_OUTPUT_SCRIPT')
  const script=Buffer.from(scriptHex,'hex')
  return Buffer.concat([u64(valueSats),varInt(script.length),script])
}

export function buildCoinbase({height,valueSats,payoutScriptHex,extranonce1Hex='',extranonce2Hex='',extranonce2Size=null,tag='/NEO-World-Mint/',witnessCommitmentHex=null}={}){
  if(!(Number(height)>0))throw new Error('HEIGHT_REQUIRED')
  if(BigInt(valueSats||0)<=0n)throw new Error('COINBASE_VALUE_REQUIRED')
  if(!/^[0-9a-f]+$/i.test(payoutScriptHex||''))throw new Error('PAYOUT_SCRIPT_REQUIRED')
  for(const x of [extranonce1Hex,extranonce2Hex])if(!/^[0-9a-f]*$/i.test(x)||x.length%2)throw new Error('INVALID_EXTRANONCE')
  const extra2Bytes=extranonce2Size==null?extranonce2Hex.length/2:Number(extranonce2Size)
  if(!Number.isInteger(extra2Bytes)||extra2Bytes<0)throw new Error('INVALID_EXTRANONCE2_SIZE')
  if(extranonce2Hex.length&&extranonce2Hex.length!==extra2Bytes*2)throw new Error('INVALID_EXTRANONCE2_SIZE')

  const scriptPrefix=Buffer.concat([bip34HeightPush(height),Buffer.from(tag),Buffer.from(extranonce1Hex,'hex')])
  const scriptSig=Buffer.concat([scriptPrefix,Buffer.from(extranonce2Hex,'hex')])
  if(scriptSig.length<2||scriptSig.length>100)throw new Error('COINBASE_SCRIPTSIG_SIZE')

  const prevout=Buffer.concat([Buffer.alloc(32),Buffer.from('ffffffff','hex')])
  const sequence=Buffer.from('ffffffff','hex')
  const outputs=[output(valueSats,payoutScriptHex)]
  if(witnessCommitmentHex)outputs.push(output(0,witnessCommitmentHex))
  const outs=Buffer.concat([varInt(outputs.length),...outputs])
  const version=Buffer.from('02000000','hex'),locktime=Buffer.alloc(4)
  const scriptLength=varInt(scriptPrefix.length+extra2Bytes)
  const prefix=Buffer.concat([version,varInt(1),prevout,scriptLength,scriptPrefix])
  const suffix=Buffer.concat([sequence,outs,locktime])
  const stripped=Buffer.concat([prefix,Buffer.from(extranonce2Hex,'hex'),suffix])

  let full=stripped
  if(witnessCommitmentHex){
    const witness=Buffer.concat([Buffer.from([1,32]),Buffer.alloc(32)])
    full=Buffer.concat([version,Buffer.from('0001','hex'),varInt(1),prevout,scriptLength,scriptSig,sequence,outs,witness,locktime])
  }
  return Object.freeze({
    fullHex:full.toString('hex'),
    strippedHex:stripped.toString('hex'),
    coinbase1Hex:prefix.toString('hex'),
    coinbase2Hex:suffix.toString('hex'),
    txid:Buffer.from(dsha256(stripped)).reverse().toString('hex'),
    scriptSigHex:scriptSig.toString('hex')
  })
}

export function merkleRootFromTxids(txids=[]){
  if(!txids.length)throw new Error('TXIDS_REQUIRED')
  let level=txids.map(h=>{if(!/^[0-9a-f]{64}$/i.test(h))throw new Error('INVALID_TXID');return Buffer.from(h,'hex').reverse()})
  while(level.length>1){
    if(level.length%2)level.push(level[level.length-1])
    const next=[]
    for(let i=0;i<level.length;i+=2)next.push(dsha256(Buffer.concat([level[i],level[i+1]])))
    level=next
  }
  return Buffer.from(level[0]).reverse().toString('hex')
}

export function merkleBranchForCoinbase(transactionTxids=[]){
  let level=[null,...transactionTxids.map(h=>{if(!/^[0-9a-f]{64}$/i.test(h))throw new Error('INVALID_TXID');return Buffer.from(h,'hex').reverse()})]
  const branch=[]
  let index=0
  while(level.length>1){
    if(level.length%2)level.push(level[level.length-1])
    const sibling=index^1
    if(level[sibling])branch.push(Buffer.from(level[sibling]).reverse().toString('hex'))
    const next=[]
    for(let i=0;i<level.length;i+=2){
      if(level[i]===null||level[i+1]===null)next.push(null)
      else next.push(dsha256(Buffer.concat([level[i],level[i+1]])))
    }
    index=Math.floor(index/2)
    level=next
  }
  return branch
}

export function applyMerkleBranch(coinbaseTxid,branch=[]){
  if(!/^[0-9a-f]{64}$/i.test(coinbaseTxid||''))throw new Error('INVALID_TXID')
  let hash=Buffer.from(coinbaseTxid,'hex').reverse()
  for(const sibling of branch){if(!/^[0-9a-f]{64}$/i.test(sibling||''))throw new Error('INVALID_MERKLE_BRANCH');hash=dsha256(Buffer.concat([hash,Buffer.from(sibling,'hex').reverse()]))}
  return Buffer.from(hash).reverse().toString('hex')
}

export function serializeHeader({version,previousBlockHash,merkleRoot,time,bits,nonce}){
  for(const h of [previousBlockHash,merkleRoot])if(!/^[0-9a-f]{64}$/i.test(h||''))throw new Error('INVALID_HEADER_HASH')
  if(!/^[0-9a-f]{8}$/i.test(bits||''))throw new Error('INVALID_BITS')
  const b=Buffer.alloc(80)
  b.writeInt32LE(Number(version),0)
  Buffer.from(previousBlockHash,'hex').reverse().copy(b,4)
  Buffer.from(merkleRoot,'hex').reverse().copy(b,36)
  b.writeUInt32LE(Number(time)>>>0,68)
  Buffer.from(bits,'hex').reverse().copy(b,72)
  b.writeUInt32LE(Number(nonce)>>>0,76)
  return b
}

export function serializeBlock({header,coinbaseFullHex,transactions=[]}){
  if(!Buffer.isBuffer(header)||header.length!==80)throw new Error('HEADER_REQUIRED')
  if(!/^[0-9a-f]+$/i.test(coinbaseFullHex||''))throw new Error('COINBASE_REQUIRED')
  for(const tx of transactions)if(!/^[0-9a-f]+$/i.test(tx?.data||''))throw new Error('RAW_TEMPLATE_TRANSACTION_REQUIRED')
  return Buffer.concat([header,varInt(transactions.length+1),Buffer.from(coinbaseFullHex,'hex'),...transactions.map(tx=>Buffer.from(tx.data,'hex'))]).toString('hex')
}
