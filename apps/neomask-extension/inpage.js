class NeoMaskProvider extends EventTarget{
  #pending=new Map();#seq=0;
  constructor(){super();window.addEventListener('message',e=>{if(e.source!==window||e.data?.source!=='NEOMASK_EXTENSION')return;const p=this.#pending.get(e.data.id);if(!p)return;this.#pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error.message||'NeoMask request failed')):p.resolve(e.data.result)})}
  request({method,params=[]}={}){if(typeof method!=='string'||!method.startsWith('neo_'))return Promise.reject(new Error('Unsupported NeoMask method'));const id='neo-'+(++this.#seq);return new Promise((resolve,reject)=>{this.#pending.set(id,{resolve,reject});window.postMessage({source:'NEOMASK_PAGE',id,method,params},'*')})}
}
if(!window.neoMask)Object.defineProperty(window,'neoMask',{value:new NeoMaskProvider(),configurable:false,writable:false});
window.dispatchEvent(new Event('neomask#initialized'));
