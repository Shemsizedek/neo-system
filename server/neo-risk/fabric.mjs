const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)

export function normalizePosition(input={}){
  if(!input.portfolio_id||!input.asset)throw new TypeError('portfolio_id and asset required')
  return {
    portfolio_id:String(input.portfolio_id),
    asset:String(input.asset).toUpperCase(),
    quantity:Number(input.quantity||0),
    average_cost:input.average_cost==null?null:Number(input.average_cost),
    realized_pnl:Number(input.realized_pnl||0)
  }
}

export function markPosition(position,{price}={}){
  const px=Number(price)
  if(!Number.isFinite(px)||px<=0)return {...clone(position),price:null,market_value:null,unrealized_pnl:null,status:'PRICE_MISSING'}
  const marketValue=Number(position.quantity)*px
  const unrealized=position.average_cost==null?null:(px-Number(position.average_cost))*Number(position.quantity)
  return {...clone(position),price:px,market_value:marketValue,unrealized_pnl:unrealized,status:'MARKED'}
}

export function portfolioExposure(marked=[]){
  const valid=marked.filter(x=>Number.isFinite(x.market_value))
  const gross=valid.reduce((n,x)=>n+Math.abs(Number(x.market_value)),0)
  const net=valid.reduce((n,x)=>n+Number(x.market_value),0)
  const byAsset=Object.fromEntries(valid.map(x=>[x.asset,Number(x.market_value)]))
  return {gross,net,by_asset:byAsset,missing_prices:marked.filter(x=>x.status==='PRICE_MISSING').map(x=>x.asset)}
}

export function concentrationRisk(marked=[]){
  const exposure=portfolioExposure(marked),gross=exposure.gross
  const rows=marked.filter(x=>Number.isFinite(x.market_value)).map(x=>({asset:x.asset,share:gross?Math.abs(x.market_value)/gross:0,market_value:x.market_value})).sort((a,b)=>b.share-a.share)
  return {largest:rows[0]||null,rows}
}

export function calculateParametricVar({marked=[],volatilityByAsset={},confidenceZ=2.326,horizonDays=1}={}){
  const missing=[]
  let variance=0
  for(const p of marked){
    if(!Number.isFinite(p.market_value)){missing.push(p.asset);continue}
    const vol=Number(volatilityByAsset[p.asset])
    if(!Number.isFinite(vol)||vol<0){missing.push(p.asset);continue}
    variance+=(Number(p.market_value)*vol)**2
  }
  if(missing.length)return {available:false,reason:'missing_price_or_volatility',missing_assets:[...new Set(missing)]}
  return {available:true,var:Math.abs(Number(confidenceZ))*Math.sqrt(variance)*Math.sqrt(Number(horizonDays)),confidence_z:Number(confidenceZ),horizon_days:Number(horizonDays)}
}

export function runStress(marked=[],scenarios={}){
  const results={}
  for(const [name,shocks] of Object.entries(scenarios)){
    let pnl=0,missing=[]
    for(const p of marked){
      if(!Number.isFinite(p.market_value)){missing.push(p.asset);continue}
      const shock=Number(shocks[p.asset]??0)
      pnl+=Number(p.market_value)*shock
    }
    results[name]={pnl,missing_assets:[...new Set(missing)]}
  }
  return results
}

export function marginUtilization({required_margin,eligible_collateral}={}){
  const required=Number(required_margin),eligible=Number(eligible_collateral)
  if(!Number.isFinite(required)||!Number.isFinite(eligible)||required<0||eligible<0)return {available:false,reason:'invalid_margin_inputs'}
  if(required===0)return {available:true,utilization:0,headroom:eligible,status:'NO_MARGIN_REQUIRED'}
  const utilization=required/eligible
  return {available:true,utilization,headroom:eligible-required,status:eligible>=required?'SATISFIED':'DEFICIT'}
}

export function evaluateLimits({exposure,concentration,varResult,margin,limits={},openOrderNotional=0}={}){
  const breaches=[]
  if(exposure?.missing_prices?.length)breaches.push('missing_prices')
  if(limits.max_gross_exposure!=null&&Number(exposure?.gross||0)>Number(limits.max_gross_exposure))breaches.push('gross_exposure_limit')
  if(limits.max_net_exposure!=null&&Math.abs(Number(exposure?.net||0))>Number(limits.max_net_exposure))breaches.push('net_exposure_limit')
  if(limits.max_single_asset_share!=null&&Number(concentration?.largest?.share||0)>Number(limits.max_single_asset_share))breaches.push('concentration_limit')
  if(limits.max_var!=null&&varResult?.available&&Number(varResult.var)>Number(limits.max_var))breaches.push('var_limit')
  if(limits.max_open_order_notional!=null&&Number(openOrderNotional)>Number(limits.max_open_order_notional))breaches.push('open_order_limit')
  if(margin?.available&&margin.status==='DEFICIT')breaches.push('margin_deficit')
  if(margin?.available===false)breaches.push('margin_unknown')
  return {allowed:breaches.length===0,breaches}
}

export function createKillSwitch({scope='GLOBAL',reason,actor_id}={}){
  if(!reason)throw new TypeError('reason required')
  return {kill_switch_id:`KILL-${Date.now()}`,scope:String(scope),reason:String(reason),actor_id:actor_id||null,active:true,activated_at:now()}
}

export function applyKillSwitch(orderRisk,{killSwitch}={}){
  if(killSwitch?.active)return {allowed:false,reason:'kill_switch_active',kill_switch_id:killSwitch.kill_switch_id}
  return orderRisk?.allowed===true?{allowed:true,reason:'risk_pass'}:{allowed:false,reason:'risk_breach',breaches:orderRisk?.breaches||[]}
}

export function liquidationRecommendation({marked=[],margin,policy={}}={}){
  if(!margin?.available||margin.status!=='DEFICIT')return {required:false,action:'NONE'}
  const ranked=marked.filter(x=>Number.isFinite(x.market_value)).sort((a,b)=>Math.abs(b.market_value)-Math.abs(a.market_value))
  return {
    required:true,
    action:'REVIEW_AND_AUTHORIZE',
    auto_execution:false,
    deficit:Math.abs(Number(margin.headroom)),
    candidates:ranked.slice(0,5).map(x=>({asset:x.asset,market_value:x.market_value})),
    policy_ref:policy.policy_ref||null
  }
}

export function riskSnapshot({marked=[],varResult,stress={},margin,limitsResult,killSwitch=null}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Institutional Risk, Margin & Portfolio Control',
    exposure:portfolioExposure(marked),
    concentration:concentrationRisk(marked),
    var:varResult,
    stress,
    margin,
    limits:limitsResult,
    kill_switch:{active:Boolean(killSwitch?.active),id:killSwitch?.kill_switch_id||null},
    auto_liquidation:false,
    generated_at:now()
  }
}
