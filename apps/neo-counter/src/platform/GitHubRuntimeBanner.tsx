import { useEffect, useState } from 'react';
import { loadPlatformRuntime, type PlatformRuntime } from './runtime';

const pretty=(value:string)=>value.replaceAll('-',' ');

export default function GitHubRuntimeBanner(){
  const [runtime,setRuntime]=useState<PlatformRuntime|null>(null);
  useEffect(()=>{loadPlatformRuntime().then(setRuntime);},[]);
  const commit=runtime?.commit && runtime.commit!=='local' ? runtime.commit.slice(0,7) : null;
  return <div className="github-runtime" role="status" aria-live="polite">
    <strong>NEO Counter Runtime</strong>
    <span>GitHub Backend</span>
    <span>GitHub Pages Frontend</span>
    <span>{pretty(runtime?.mode||'local-first')}</span>
    {commit&&<span>build {commit}</span>}
  </div>;
}
