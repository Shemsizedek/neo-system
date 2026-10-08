// Production integration is opt-in and limited to BIP-322 simple verification.
// Strip the finalized BIP-322 simple prefix before calling the legacy-format library.\n// Strict verification disables loose BIP-137 fallback; release still requires vectors.
export function createBip322Verifier(){
  return async ({address,message,signature,network,scheme})=>{
    if(scheme!=='BIP322'||typeof signature!=='string'||!signature.startsWith('smp'))return false;
    if(!['bitcoin-mainnet','bitcoin-testnet','counterparty-mainnet'].includes(network))return false;
    // Until address decoding is integrated, accept ONLY recognizable segwit mainnet/testnet prefixes.
    const mainnet=network!=='bitcoin-testnet';
    if(mainnet?!/^bc1[qp][a-z0-9]{20,87}$/.test(address):!/^tb1[qp][a-z0-9]{20,87}$/.test(address))return false;
    try{
      const {Verifier}=await import('bip322-js');
      return (await Verifier.verifySignature(address,message,signature.slice(3),true))===true;
    }catch{return false}
  };
}
