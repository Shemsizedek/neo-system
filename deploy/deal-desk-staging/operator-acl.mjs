export function makeOperatorAcl({db,now=()=>Date.now()}={}) {
 if(!db?.collection)throw Error('firestore_required');
 return async function isOperator(subject) {
  if(typeof subject!=='string'||!/^google:[A-Za-z0-9_-]+$/.test(subject))return false;
  const docs=await db.collection('neoDealDeskOperatorGrants').where('subject','==',subject).limit(2).get();
  if(docs.empty||docs.docs.length!==1)return false;
  const grant=docs.docs[0].data();
  return grant.subject===subject&&grant.permission==='neo_sales_operator'&&grant.status==='active'&&Boolean(grant.approvedBy)&&Number.isFinite(Date.parse(grant.expiresAt))&&Date.parse(grant.expiresAt)>now();
 };
}
export function attachOperatorAcl({credentials, isOperator}={}) {
 if(!credentials?.getNEOpassCredential||typeof isOperator!=='function')throw Error('registry_required');
 return {async getNEOpassCredential(subject){
  const member=await credentials.getNEOpassCredential(subject);
  if(!member||member.status!=='active')return member;
  return {...member,permissions:await isOperator(subject)?['neo_sales_operator']:[]};
 }};
}
