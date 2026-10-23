export class NeoMaskSignerBridge{
  constructor({transport}={}){if(typeof transport?.request!=='function')throw new TypeError('transport.request required');this.transport=transport}
  async request({method,payload}={}){
    if(!['neo_signPsbt','neo_signCounterpartyTransaction','neo_signMessage'].includes(method))throw new Error('unsupported_signer_method')
    const review=await this.transport.request({type:'SIGN_REQUEST',method,payload})
    if(!review?.approved)throw new Error(review?.reason||'signing_not_approved')
    if(review.private_key||review.seed_phrase)throw new Error('signer_secret_exposure_prohibited')
    return review
  }
}
