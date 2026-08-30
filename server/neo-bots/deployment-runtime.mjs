import { BotRegistry, AuditLedger, NeoBotRuntime } from './runtime.mjs';
import { NEO_BANK_BOT, createNeoBankHandler, createStubCesAdapter } from './bank-bot.mjs';

let singleton;

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

export function resetNeoBotsDeploymentRuntimeForTests(){
  singleton=undefined;
}
