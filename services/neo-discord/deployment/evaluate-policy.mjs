import fs from 'node:fs'

export function loadPolicy(path='services/neo-discord/deployment/runtime-policy.json'){
  return JSON.parse(fs.readFileSync(path,'utf8'))
}

export function validatePolicy(policy){
  const errors=[]
  if(policy?.service!=='neo-discord')errors.push('service must be neo-discord')
  if(policy?.sourceOfTruth!=='github')errors.push('sourceOfTruth must be github')
  if(policy?.frontendPlane!=='github-pages')errors.push('frontendPlane must be github-pages')
  if(policy?.serverApiPlane!=='discord')errors.push('serverApiPlane must be discord')
  if(policy?.rules?.discordIsPrimaryServerApiPlane!==true)errors.push('Discord must remain primary server/API plane')
  if(policy?.rules?.githubIsPrimaryBackendPlane!==true)errors.push('GitHub must remain primary backend plane')
  if(policy?.rules?.githubPagesIsPrimaryFrontendPlane!==true)errors.push('GitHub Pages must remain primary frontend plane')
  if(policy?.rules?.transportBridgeMayBecomeBackend!==false)errors.push('transport bridge may not become backend')
  if(policy?.rules?.mayChangeAuthorizationPolicy!==false)errors.push('transport change may not change authorization policy')
  if(policy?.rules?.mayEnableSensitiveExecution!==false)errors.push('transport change may not enable sensitive execution')
  if(policy?.rules?.mayApproveIntents!==false)errors.push('transport change may not approve intents')
  for(const [name,bridge] of Object.entries(policy?.transportBridges||{})){
    if(typeof bridge!=='object')continue
    if(bridge.ownsBusinessLogic!==false)errors.push(`${name} may not own NEO business logic`)
  }
  return errors
}

if(import.meta.url===`file://${process.argv[1]}`){
  const policy=loadPolicy(process.argv[2])
  const errors=validatePolicy(policy)
  if(errors.length){for(const error of errors)console.error(error);process.exit(1)}
  console.log(`NEO three-plane policy valid: GitHub backend -> GitHub Pages frontend -> Discord server/API`)
}
