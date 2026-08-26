const OMNI_THEMES=[
  {id:'forest',name:'Forest',accent:'#63e894',bg:'#07110d',panel:'#0d1812'},
  {id:'midnight',name:'Midnight',accent:'#77a7ff',bg:'#060913',panel:'#0d1422'},
  {id:'solar',name:'Solar',accent:'#f3c86b',bg:'#131006',panel:'#1d180b'},
  {id:'violet',name:'Violet',accent:'#bd8cff',bg:'#0d0713',panel:'#170d20'}
];

function dailyTheme(){
  const d=new Date();
  const seed=Number(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`);
  return OMNI_THEMES[seed%OMNI_THEMES.length];
}

function applyTheme(theme){
  document.documentElement.style.setProperty('--accent',theme.accent);
  document.documentElement.style.setProperty('--omni-bg',theme.bg);
  document.documentElement.style.setProperty('--omni-panel',theme.panel);
  document.body.dataset.theme=theme.id;
  localStorage.setItem('omnitrix-theme',theme.id);
  const name=document.getElementById('themeName'); if(name) name.textContent=theme.name;
  renderLogo(theme);
}

function renderLogo(theme){
  const host=document.getElementById('omnitrixLogo'); if(!host) return;
  const day=new Date().getUTCDate();
  const points=6+(day%4);
  const spokes=Array.from({length:points},(_,i)=>{
    const a=(Math.PI*2*i)/points;
    const x1=32+Math.cos(a)*11, y1=32+Math.sin(a)*11;
    const x2=32+Math.cos(a)*24, y2=32+Math.sin(a)*24;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
  }).join('');
  host.innerHTML=`<svg viewBox="0 0 64 64" role="img" aria-label="Omnitrix logo"><circle cx="32" cy="32" r="27" fill="none"/><circle cx="32" cy="32" r="10" fill="${theme.accent}" opacity=".18"/>${spokes}<circle cx="32" cy="32" r="5" fill="${theme.accent}"/></svg>`;
}

function looksLikeUrl(value){
  const v=value.trim();
  if(/^https?:\/\//i.test(v)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(v) && !/\s/.test(v);
}

function normalizedUrl(value){
  const v=value.trim();
  return /^https?:\/\//i.test(v)?v:`https://${v}`;
}

function wireOmnibox(){
  const form=document.getElementById('searchForm');
  const input=document.getElementById('queryInput');
  const go=document.getElementById('goWebButton');
  if(!form||!input) return;
  form.addEventListener('submit',event=>{
    if(looksLikeUrl(input.value)){
      event.preventDefault(); event.stopImmediatePropagation();
      window.location.assign(normalizedUrl(input.value));
    }
  },true);
  go?.addEventListener('click',()=>{
    const value=input.value.trim(); if(!value) return;
    if(looksLikeUrl(value)) window.location.assign(normalizedUrl(value));
    else window.open(`https://duckduckgo.com/?q=${encodeURIComponent(value)}`,'_blank','noopener,noreferrer');
  });
}

function wireThemes(){
  const saved=localStorage.getItem('omnitrix-theme');
  applyTheme(OMNI_THEMES.find(t=>t.id===saved)||dailyTheme());
  document.getElementById('themeButton')?.addEventListener('click',()=>{
    const current=document.body.dataset.theme;
    const idx=Math.max(0,OMNI_THEMES.findIndex(t=>t.id===current));
    applyTheme(OMNI_THEMES[(idx+1)%OMNI_THEMES.length]);
  });
}

wireThemes();
wireOmnibox();
