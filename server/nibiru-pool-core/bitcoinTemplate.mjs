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
      target:result.target||null,
      version:Number(result.version),
      curtime:Number(result.curtime),
      mintime:Number(result.mintime||0),
      coinbaseValueSats:String(result.coinbasevalue??0),
      coinbaseAux:result.coinbaseaux||{},
      coinbaseTxn:result.coinbasetxn||null,
      defaultWitnessCommitment:result.default_witness_commitment||null,
      transactions:Array.isArray(result.transactions)?result.transactions.map(tx=>({
        txid:tx.txid,
        hash:tx.hash,
        data:tx.data||null,
        fee:tx.fee??null,
        sigops:tx.sigops??null,
        weight:tx.weight??null,
        depends:tx.depends||[]
      })):[],
      mutable:result.mutable||[],
      rules:result.rules||rules,
      vbavailable:result.vbavailable||{},
      vbrequired:Number(result.vbrequired||0),
      sizelimit:Number(result.sizelimit||0),
      weightlimit:Number(result.weightlimit||0),
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
