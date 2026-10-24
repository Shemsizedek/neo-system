/** HR045 - Global Temple Guild association: canonical source required.
 * This registry does not infer offices, ranks or rights from apprenticeship tracks.
 */
export function proposeGuildLearningLink({guildAuthorityRecord,apprenticeSubject,track,gissEnrollmentId,mentorSubject}={}){
 const issues=[]
 if(!guildAuthorityRecord||guildAuthorityRecord.provenance!=='CANONICAL_TEMPLE_SOURCE'||guildAuthorityRecord.approved!==true)issues.push('canonical_guild_authority_required')
 if(typeof guildAuthorityRecord?.guildId!=='string'||!guildAuthorityRecord.guildId.trim())issues.push('guild_id_required')
 for(const [name,value] of Object.entries({apprenticeSubject,track,gissEnrollmentId,mentorSubject})){
  if(typeof value!=='string'||!value.trim())issues.push(name+'_required')
 }
 return Object.freeze({guildId:guildAuthorityRecord?.guildId??null,systems:['Temple Guild','NEO Careers','GISD','GISS','NEO Cipher'],status:issues.length?'blocked':'ready-for-authorized-review',issues,memberAdmitted:false,enrollmentChanged:false,rankGranted:false,employmentGranted:false})
}
