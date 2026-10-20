export function sitePattern(value) {
  const url=new URL(value);
  if(url.protocol!=='https:' || url.username || url.password || url.port)throw new Error('Open a standard HTTPS website first.');
  return url.origin+'/*';
}
export async function enableSite(api,tab) {
  const pattern=sitePattern(tab?.url);
  if(!Number.isInteger(tab.id))throw new Error('No active website tab.');
  if(!await api.permissions.request({origins:[pattern]}))throw new Error('Site access was not granted.');
  const scripts=await api.scripting.getRegisteredContentScripts();
  const id='neomask-'+encodeURIComponent(pattern);
  if(!scripts.some(s=>s.id===id+'-page'))await api.scripting.registerContentScripts([
    {id:id+'-page',matches:[pattern],js:['provider.js'],world:'MAIN',runAt:'document_start',allFrames:false,persistAcrossSessions:true},
    {id:id+'-bridge',matches:[pattern],js:['content.js'],world:'ISOLATED',runAt:'document_start',allFrames:false,persistAcrossSessions:true}
  ]);
  return pattern;
}
export async function pageOrigin(api,sender) {
  if(!sender.tab || sender.frameId!==0)throw new Error('Top-level page required');
  const url=new URL(sender.url);
  const pattern=sitePattern(url.href);
  if(new URL(sender.tab.url || sender.url).origin!==url.origin)throw new Error('Page origin mismatch');
  if(url.origin!=='https://holytemples.org' && !await api.permissions.contains({origins:[pattern]}))throw new Error('Enable this site from NeoMask first.');
  return url.origin;
}
