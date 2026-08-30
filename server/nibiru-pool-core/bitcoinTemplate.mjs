import crypto from 'node:crypto'

const now=()=>new Date().toISOString()

export function templateAdapter({rpc}){
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  return async function getTemplate({rules=['segwit']}={}){
    const result=await rpc('getblocktemplate',[{rules}])
    if(!result?.previousblockhash||!result?.bits||!result?.height) throw new Error('BITCOIN_TEMPLATE_INVALID')
    return Object.freeze({
      templateId:`tmpl_${crypto.randomUUID()}`,
      height:Number(result.height),
      previousBlockHash:result.previousblockhash,
      bits:result.bits,
      version:Number(result.version),
      curtime:Number(result.curtime),
      mintime:Number(result.mintime||0),
      coinbaseValueSats:String(result.coinbasevalue??0),
      transactions:Array.isArray(result.transactions)?result.transactions.map(tx=>({txid:tx.txid,hash:tx.hash,fee:tx.fee??null,weight:tx.weight??null,depends:tx.depends||[]})):[],
      mutable:result.mutable||[],
      rules:result.rules||rules,
      longpollid:result.longpollid||null,
      createdAt:now(),
      source:'BITCOIN_CORE_GETBLOCKTEMPLATE'
    })
  }
}

export async function submitSolvedBlock({blockHex,rpc}){
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  if(typeof blockHex!=='string'||blockHex.length<160||!/^[0-9a-f]+$/i.test(blockHex)) throw new Error('BLOCK_HEX_REQUIRED')
  const result=await rpc('submitblock',[blockHex])
  return Object.freeze({accepted:result===null,result,submittedAt:now()})
}
