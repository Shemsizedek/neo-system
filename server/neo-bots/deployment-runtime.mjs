import { BotRegistry, AuditLedger, NeoBotRuntime } from './runtime.mjs';
import { NEO_BANK_BOT, createNeoBankHandler, createStubCesAdapter } from './bank-bot.mjs';
import { createNeoBotsAdminHttpHandler } from './admin-http.mjs';

let singleton;

function csv(value){return String(value||'').split(',').map((item)=>item.trim()).filter(Boolean);}

export function createNeoBotsDeploymentRuntime({cesAdapter=createStubCesAdapter()}={}){
  const registry=new BotRegistry();
  registry.register(NEO_BANK_BOT);
  const runtime=new NeoBotRuntime({registry,audit:new AuditLedger()});
  runtime.attach(NEO_BANK_BOT.id,createNeoBankHandler({cesAdapter}));
  return runtime;
}

export function getNeoBotsDeploymentRuntime(){
  if(!singleton)singleton=createNeoBotsDeploymentRuntime();
  return singleton;
}

export function createNeoBotsDeploymentControlHandler(env=process.env){
  const operatorIds=csv(env.NEO_BOTS_OPERATOR_IDS||env.DISCORD_OPERATOR_USER_IDS);
  return createNeoBotsAdminHttpHandler({
    runtimeFactory:()=>getNeoBotsDeploymentRuntime(),
    tokenProvider:()=>env.NEO_BOTS_CONTROL_TOKEN,
    operatorPolicy:(actor)=>operatorIds.length>0&&operatorIds.includes(String(actor?.id||'')),
  });
}

export function neoBotsDeploymentHealth(env=process.env){
  return {
    controlTokenConfigured:Boolean(env.NEO_BOTS_CONTROL_TOKEN),
    operatorAllowlistConfigured:csv(env.NEO_BOTS_OPERATOR_IDS||env.DISCORD_OPERATOR_USER_IDS).length>0,
    cesCredentialsConfigured:Object.keys(env).some((key)=>/^NEO_CES_[A-Z0-9_]+_USERNAME$/.test(key))&&Object.keys(env).some((key)=>/^NEO_CES_[A-Z0-9_]+_PASSWORD$/.test(key)),
    liveCesExecutionEnabled:false,
  };
}

export function resetNeoBotsDeploymentRuntimeForTests(){
  singleton=undefined;
}
