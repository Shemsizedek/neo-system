import { APPRENTICE_TRACKS, assessGlobalApprenticeIntake } from './global-apprenticeship.mjs'
/** Review-only memory registry. No PII, storage, live applications or employment actions. */
export function createTempleApprenticeshipRegistry(){
 const mentors=new Map(),candidates=new Map()
 return Object.freeze({
  registerMentor({id,track,verified=false,capacity=0}={}){
   if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw new TypeError('invalid mentor id')
   if(!APPRENTICE_TRACKS.includes(track))throw new TypeError('invalid track')
   if(!Number.isInteger(capacity)||capacity<0||capacity>20)throw new TypeError('invalid capacity')
   const mentor=Object.freeze({id,track,verified:verified===true,capacity})
   mentors.set(id,mentor);return mentor
  },
  reviewCandidate({id,country,age,track,engagement='training',programApproved=false,jurisdictionReviewed=false,mentorId}={}){
   if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw new TypeError('invalid application id')
   const mentor=mentors.get(mentorId)
   const assigned=Boolean(mentor?.verified&&mentor.track===track&&mentor.capacity>0)
   const outcome=assessGlobalApprenticeIntake({age,country,track,engagement,mentorAssigned:assigned,programApproved,jurisdictionReviewed})
   const record=Object.freeze({id,track,engagement,country,mentorId:assigned?mentorId:null,status:outcome.eligibleForHumanReview?'ready-for-human-review':'blocked',blockers:outcome.blockers,offerEnabled:false,paymentEnabled:false})
   candidates.set(id,record);return record
  },
  listReviewRecords(){return [...candidates.values()].map(x=>({...x}))},
  capabilities(){return {persistent:false,liveIntake:false,publication:false,canOffer:false,canPay:false}}
 })
}
