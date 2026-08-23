import type {CaseType,TribunalCase} from './tribunalEngine'

export interface ChaplaincyEFile {
  filingId:string
  caseType:CaseType
  respondentLocation:string
  petitioner:string
  petitionerTempleCouncil:string
  respondent:string
  respondentTempleCouncil:string
  petitionerLocation:string
  claimNo:string
  respondentEmail:string
  email:string
  statement:string
  filedAt?:string
  status:'DRAFT'|'FILED'|'RETURNED'
}

export function createEFile(sequence=1):ChaplaincyEFile{
  return {filingId:`EF-${String(sequence).padStart(5,'0')}`,caseType:'TEMPLE_INJUSTICE',respondentLocation:'',petitioner:'',petitionerTempleCouncil:'',respondent:'',respondentTempleCouncil:'',petitionerLocation:'',claimNo:'',respondentEmail:'',email:'',statement:'',status:'DRAFT'}
}

export function validateEFile(file:ChaplaincyEFile){
  const required:[keyof ChaplaincyEFile,string][]=[['respondentLocation','Respondent location'],['petitioner','Petitioner'],['petitionerTempleCouncil','Petitioner Temple Council'],['respondent','Respondent'],['respondentTempleCouncil','Respondent Temple Council'],['petitionerLocation','Petitioner location'],['claimNo','Claim number'],['respondentEmail','Respondent email'],['email','Petitioner email'],['statement','Statement']]
  const problems=required.filter(([key])=>!String(file[key]??'').trim()).map(([,label])=>`${label} is required`)
  const emails=[file.email,file.respondentEmail].filter(Boolean);for(const email of emails)if(!/^\S+@\S+\.\S+$/.test(email))problems.push(`Invalid email: ${email}`)
  return {valid:problems.length===0,problems}
}

export function fileEFile(file:ChaplaincyEFile):ChaplaincyEFile{
  const check=validateEFile(file);if(!check.valid)throw new Error(check.problems.join('; '))
  return {...file,status:'FILED',filedAt:new Date().toISOString()}
}

export function eFileToCase(file:ChaplaincyEFile):TribunalCase{
  if(file.status!=='FILED')throw new Error('E-File must be filed before creating a docket.')
  return {claimNo:file.claimNo,caseType:file.caseType,petitioner:{name:file.petitioner,council:file.petitionerTempleCouncil,location:file.petitionerLocation,email:file.email},respondent:{name:file.respondent,council:file.respondentTempleCouncil,location:file.respondentLocation,email:file.respondentEmail},statement:file.statement,status:'INTAKE',citations:[],evidence:[],createdAt:file.filedAt??new Date().toISOString()}
}
