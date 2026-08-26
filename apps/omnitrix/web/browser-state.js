const STORE={bookmarks:'omnitrix-bookmarks',history:'omnitrix-history',settings:'omnitrix-settings',downloads:'omnitrix-downloads',session:'omnitrix-session'};
const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
function addHistory(entry){const items=read(STORE.history).filter(x=>x.url!==entry.url);items.unshift({...entry,visitedAt:new Date().toISOString()});write(STORE.history,items.slice(0,100));return items}
function addBookmark(entry){const items=read(STORE.bookmarks);if(!items.some(x=>x.url===entry.url))items.unshift({...entry,savedAt:new Date().toISOString()});write(STORE.bookmarks,items.slice(0,100));return items}
function removeBookmark(url){const items=read(STORE.bookmarks).filter(x=>x.url!==url);write(STORE.bookmarks,items);return items}
function getBookmarks(){return read(STORE.bookmarks)}function getHistory(){return read(STORE.history)}
function getSettings(){return read(STORE.settings,{homepage:'../noogle/',search:'noogle',matrixRain:true,privacyMode:false,restoreSession:true})}
function saveSettings(patch){const next={...getSettings(),...patch};write(STORE.settings,next);return next}
function addDownload(entry){const items=read(STORE.downloads);items.unshift({...entry,createdAt:new Date().toISOString()});write(STORE.downloads,items.slice(0,50));return items}
function getDownloads(){return read(STORE.downloads)}
function saveSession(session){write(STORE.session,{...session,savedAt:new Date().toISOString()})}function getSession(){return read(STORE.session,{})}
window.omnitrixState={addHistory,addBookmark,removeBookmark,getBookmarks,getHistory,getSettings,saveSettings,addDownload,getDownloads,saveSession,getSession};
