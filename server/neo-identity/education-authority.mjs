import bindings from '../../config/identity/education-product-bindings.json' with { type: 'json' };

export const EDUCATION_PRODUCTS=Object.freeze(Object.keys(bindings.products));
export const EDUCATION_FOUNDER=bindings.canonical_subject;

const ACTION_REQUIREMENTS=Object.freeze({
  'student.record.read':['authenticated','studentRecordReadAuthorized'],
  'student.record.write':['authenticated','studentRecordWriteAuthorized','stepUpVerified'],
  'grade.assign':['authenticated','gradingAuthorized','facultyContextVerified'],
  'credential.issue':['authenticated','credentialIssuanceAuthorized','stepUpVerified'],
  'district.admin':['authenticated','districtAdminAuthorized','stepUpVerified'],
  'university.registrar':['authenticated','registrarAuthorized','stepUpVerified'],
  'classroom.course.mutate':['authenticated','externalClassroomAuthorized','courseMutationAuthorized'],
  'classroom.grade.sync':['authenticated','externalClassroomAuthorized','gradeSyncAuthorized','stepUpVerified']
});

export function getEducationFounderBinding(productId){
  const binding=bindings.products[productId];
  if(!binding) throw new Error(`Unknown education product: ${productId}`);
  return Object.freeze({productId,subjectId:EDUCATION_FOUNDER,...binding});
}

export function authorizeEducationAction(productId,action,context={}){
  const founder=getEducationFounderBinding(productId);
  const requirements=ACTION_REQUIREMENTS[action];
  if(!requirements) return {allowed:false,reason:'unsupported_action',founder};
  if(context.subjectId!==founder.subjectId) return {allowed:false,reason:'subject_mismatch',founder};
  for(const requirement of requirements){if(context[requirement]!==true)return{allowed:false,reason:`missing_${requirement}`,founder}}
  return {allowed:true,reason:'authorized',founder};
}

export function mapExternalClassroomIdentity({provider='google-classroom',externalUserId,verified=false}={}){
  if(!externalUserId) throw new Error('externalUserId is required');
  if(verified!==true) throw new Error('external classroom mapping must be verified');
  return Object.freeze({subjectId:EDUCATION_FOUNDER,provider,externalUserId:String(externalUserId),verified:true,providerRoleOverride:false,credentialsStored:false});
}
