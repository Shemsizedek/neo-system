import type {OrangeChipEvidenceInput,OrangeChipEvidenceRecord,EvidenceReviewStatus} from './orangeChipEvidence'

export type EvidenceAuditEvent={id:string;evidenceId:string;asset:string;eventType:string;actor:string;payload:Record<string,unknown>;createdAt:string}

export class EvidenceVaultApi{
  private readonly baseUrl:string
  private readonly token:string
  constructor(baseUrl=(import.meta as any).env?.VITE_NEO_EVIDENCE_API_URL||'',token=''){
    this.baseUrl=baseUrl
    this.token=token
  }

  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    if(!this.baseUrl)throw new Error('NEO Evidence Vault API is not configured.')
    const headers=new Headers(init.headers)
    headers.set('content-type','application/json')
    if(this.token)headers.set('authorization',`Bearer ${this.token}`)
    const response=await fetch(`${this.baseUrl}${path}`,{...init,headers})
    if(!response.ok)throw new Error(`Evidence Vault ${response.status}`)
    return response.json() as Promise<T>
  }

  async list(asset:string){
    const result=await this.request<{asset:string;evidence:OrangeChipEvidenceRecord[]}>(`/assets/${encodeURIComponent(asset)}/evidence`)
    return result.evidence
  }

  async ingest(input:OrangeChipEvidenceInput,_reviewer='neo-explorer'){
    return this.request<OrangeChipEvidenceRecord>(`/assets/${encodeURIComponent(input.asset)}/evidence`,{method:'POST',body:JSON.stringify(input)})
  }

  async review(asset:string,id:string,status:Exclude<EvidenceReviewStatus,'UNREVIEWED'>,_reviewer:string,note?:string){
    return this.request<OrangeChipEvidenceRecord>(`/evidence/${encodeURIComponent(id)}/review`,{method:'PATCH',body:JSON.stringify({asset,status,note})})
  }

  async audit(asset:string){
    const result=await this.request<{asset:string;events:EvidenceAuditEvent[]}>(`/assets/${encodeURIComponent(asset)}/audit`)
    return result.events
  }
}
