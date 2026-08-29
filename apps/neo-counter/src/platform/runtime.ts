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
  const base=import.meta.env.BASE_URL || '/';
  const url=new URL(`${base.replace(/\/$/,'')}/../api/neo-counter/runtime.json`,window.location.origin);
  try{
    const res=await fetch(url.toString(),{cache:'no-store'});
    if(!res.ok)return fallback;
    return {...fallback,...await res.json()};
  }catch{return fallback;}
}
