const STORE={bookmarks:'omnitrix-bookmarks',history:'omnitrix-history'};
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value.slice(0,100)));
function addHistory(entry){const items=read(STORE.history).filter(x=>x.url!==entry.url);items.unshift({...entry,visitedAt:new Date().toISOString()});write(STORE.history,items);return items}
function addBookmark(entry){const items=read(STORE.bookmarks);if(!items.some(x=>x.url===entry.url))items.unshift({...entry,savedAt:new Date().toISOString()});write(STORE.bookmarks,items);return items}
function removeBookmark(url){const items=read(STORE.bookmarks).filter(x=>x.url!==url);write(STORE.bookmarks,items);return items}
function getBookmarks(){return read(STORE.bookmarks)}
function getHistory(){return read(STORE.history)}
window.omnitrixState={addHistory,addBookmark,removeBookmark,getBookmarks,getHistory};
