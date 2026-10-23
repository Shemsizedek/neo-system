export function getNeoMask(){if(typeof window==='undefined'||!window.neoMask)throw new Error('NeoMask is not available');return window.neoMask}
export async function connectNeoMask({permissions=['accounts','read','transactions','sign']}={}){const neoMask=getNeoMask();await neoMask.request({method:'neo_requestPermissions',params:[{permissions}]});return neoMask.request({method:'neo_requestAccounts'})}
export async function simulateWithNeoMask(request){return getNeoMask().request({method:'neo_simulateTransaction',params:[request]})}
export async function signCounterpartyWithNeoMask(request){return getNeoMask().request({method:'neo_signCounterpartyTransaction',params:[request]})}
export async function signPsbtWithNeoMask(request){return getNeoMask().request({method:'neo_signPsbt',params:[request]})}
