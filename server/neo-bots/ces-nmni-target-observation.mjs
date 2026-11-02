// The authorized CES Users page may contain private membership data.
// Inspect only the exact known account identifier. Never return source HTML,
// account names, balances, membership lists, email addresses or account links.
const TARGET='NMNIBANK';
const MAX_HTML=512*1024;
const removeNonvisible=html=>html
  .replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]*>/g,' ');
const exactToken=/\bNMNIBANK\b/i;
const rowToken=/<t[dh]\b[^>]*>\s*(?:<[^>]*>\s*)*NMNIBANK\s*(?:<\/[^>]+>\s*)*<\/t[dh]>/i;
export function observeNmniBankFromUsersHtml(html){
  const unverified=Object.freeze({
    inspected:false,identifierVisible:false,recordRowVisible:false,
    controllerVerified:false,delegationVerified:false
  });
  if(typeof html!=='string' || html.length===0 || html.length>MAX_HTML) return unverified;
  const clean=html.replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  const visible=removeNonvisible(clean);
  const hasIdentifier=exactToken.test(visible);
  const rows=clean.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)??[];
  const hasRow=rows.length<=2000 && rows.some(row=>row.length<=20000 && rowToken.test(row));
  return Object.freeze({
    inspected:true,identifierVisible:hasIdentifier,
    recordRowVisible:hasRow,controllerVerified:false,delegationVerified:false
  });
}
