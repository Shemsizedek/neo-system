export type PlatformRuntime={
  service:string;
  backend:string;
  frontend:string;
  mode:string;
  generatedAt?:string;
  commit?:string;
};

const fallback:PlatformRuntime={
  service:'neo-counter',
  backend:'github-actions-snapshots',
  frontend:'github-pages',
  mode:'local-first'
};

export async function loadPlatformRuntime():Promise<PlatformRuntime>{
  const prefix=window.location.pathname.includes('/neo-system/')?'/neo-system':'';
  const url=`${window.location.origin}${prefix}/api/neo-counter/runtime.json`;
  try{
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok)return fallback;
    return {...fallback,...await res.json()};
  }catch{return fallback;}
}
