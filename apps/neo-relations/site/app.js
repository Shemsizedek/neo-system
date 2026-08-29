const state={tenant:'neo-prime',tenants:[],status:null};

async function loadJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: ${r.status}`);return r.json();}

function metric(value,label){return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;}

function render(){
  const t=state.tenants.find(x=>x.id===state.tenant)||state.tenants[0];
  document.querySelector('#serviceCount').textContent=state.tenants.length;
  document.querySelector('#metrics').innerHTML=[
    metric(t?.objects?.length||0,'CRM objects'),
    metric(t?.pipelines?.length||0,'pipelines'),
    metric(t?.modules?.length||0,'enabled modules'),
    metric('1','canonical identity graph')
  ].join('');
  document.querySelector('#relationsList').innerHTML=(t?.sample_relationships||[]).map(r=>`<div class="row"><div><strong>${r.name}</strong><br><small>${r.entity_id}</small></div><div>${r.role}<br><small>${r.service}</small></div></div>`).join('')||'<div class="row"><small>No sample relationships configured.</small></div>';
  const s=state.status||{};
  document.querySelector('#controlPlane').innerHTML=[
    ['Frontend','GitHub Pages',s.frontend],
    ['Backbone','GitHub repository + Actions',s.backbone],
    ['Server/API bus','Discord gateway',s.discord],
    ['Secrets','GitHub Actions secrets only',s.secrets]
  ].map(([name,desc,status])=>`<div class="node"><strong>${name}</strong><small>${desc} · <span class="ok">${status||'configured'}</span></small></div>`).join('');
  document.querySelector('#systemStatus').textContent=`Control plane: ${s.overall||'configured'}`;
}

async function init(){
  try{
    const [registry,status]=await Promise.all([loadJson('./data/tenants.json'),loadJson('./data/status.json')]);
    state.tenants=registry.tenants;state.status=status;
    const select=document.querySelector('#tenantSelect');
    select.innerHTML=state.tenants.map(t=>`<option value="${t.id}">${t.display_name}</option>`).join('');
    select.addEventListener('change',e=>{state.tenant=e.target.value;render();});
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
    render();
  }catch(err){document.querySelector('#systemStatus').textContent=`Control plane error: ${err.message}`;}
}
init();
