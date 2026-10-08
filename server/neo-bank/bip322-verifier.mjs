// Production integration is opt-in and limited to BIP-322 simple verification.
// Keep the complete prefixed proof in the input; do not silently downgrade to legacy BIP-137.
export function createBip322Verifier(){
  return async ({address,message,signature,network,scheme})=>{
    if(scheme!=='BIP322'||typeof signature!=='string'||!signature.startsWith('smp'))return false;
    if(!['bitcoin-mainnet','bitcoin-testnet','counterparty-mainnet'].includes(network))return false;
    // Until address decoding is integrated, accept ONLY recognizable segwit mainnet/testnet prefixes.
    const mainnet=network!=='bitcoin-testnet';
    if(mainnet?!/^bc1[qp][a-z0-9]{20,87}$/.test(address):!/^tb1[qp][a-z0-9]{20,87}$/.test(address))return false;
    try{
      const {Verifier}=await import('bip322-js');
      return (await Verifier.verifySignature(address,message,signature))===true;
    }catch{return false}
  };
}
