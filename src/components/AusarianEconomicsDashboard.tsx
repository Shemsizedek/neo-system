import React, { useState } from 'react'
import { AUSARIAN_ECONOMIC_DOCTRINE } from '../noology/ausarianEconomicDoctrine'
import { evaluateAusarianEconomics, AUSARIAN_GISS_LESSON } from '../noology/ausarianEconomicGateway'

const monetary = AUSARIAN_ECONOMIC_DOCTRINE.worldMonetarySystem
const classes = ['MB','M0','M1','M2','M3','M4','M5','M6','M7','M8','M9'] as const
const initial = { productiveInvestment:100000, annualProductiveOutput:12000, annualFinancingCost:4000, existingAnnualRent:15000, proposedAnnualRent:13000, jobsCreated:2, verifiedClaims:false, consent:false, environmentalReview:false }
/** Read-only Economics 101 dashboard. No wallet connections, issuance, price feeds, or execution. */
export default function AusarianEconomicsDashboard() {
 const [scenario,setScenario] = useState(initial)
 const [selected,setSelected] = useState<(typeof classes)[number]>('MB')
 const result = evaluateAusarianEconomics(scenario)
 const setNumber=(key: keyof typeof initial,value:string)=>setScenario(prev=>({...prev,[key]:value.trim()===''?0:Number(value)}))
 return <main style={{maxWidth:960,margin:'auto',padding:24,fontFamily:'system-ui'}}>
  <h1>NEO World Monetary System</h1><p>Ausarian Economic Philosophy — Natural Economic Order</p>
  <p role="status">NEO internal classifications · Educational simulation only · No live pricing or settlement</p>
  <section aria-label="Monetary classifications"><h2>Monetary structure</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{classes.map(k=><button type="button" aria-pressed={selected===k} key={k} onClick={()=>setSelected(k)}>{k}</button>)}</div><h3>{selected}</h3><p>{monetary[selected]}</p><p>{monetary.taxonomyBoundary}</p></section>
  <section><h2>Capital and clearing</h2><p><strong>Reserve capital:</strong> {monetary.reserveCapital}</p><p><strong>Circulatory capital:</strong> {monetary.circulatoryCapital}</p><p><strong>Exchange:</strong> {monetary.exchangeLayer}</p><p><strong>Clearing:</strong> {monetary.clearingLayer}</p></section>
  <section><h2>Productive-capital simulation</h2>{(['productiveInvestment','annualProductiveOutput','annualFinancingCost','existingAnnualRent','proposedAnnualRent','jobsCreated'] as const).map(k=><label key={k} style={{display:'block',margin:'8px 0'}}>{k} <input aria-label={k} type="number" min="0" step="any" value={scenario[k]} onChange={e=>setNumber(k,e.target.value)}/></label>)}
  {(['verifiedClaims','consent','environmentalReview'] as const).map(k=><label key={k} style={{display:'block'}}><input type="checkbox" checked={scenario[k]} onChange={e=>setScenario(prev=>({...prev,[k]:e.target.checked}))}/>{k}</label>)}
  <p>Productive yield: {result.assessment.productiveYield===null?'N/A':(result.assessment.productiveYield*100).toFixed(2)+'%'}</p><p>Financing cost ratio: {result.assessment.financingCostRatio===null?'N/A':(result.assessment.financingCostRatio*100).toFixed(2)+'%'}</p><p>Annual rent difference: {result.assessment.rentCompetitionDelta.toLocaleString()}</p>
  <h3>Review flags</h3><ul>{result.assessment.flags.length?result.assessment.flags.map(f=><li key={f}>{f}</li>):<li>No scenario flags detected; not a financial approval.</li>}</ul></section>
  <section><h2>{AUSARIAN_GISS_LESSON.title}</h2><p>{AUSARIAN_GISS_LESSON.exercise}</p><ul>{AUSARIAN_GISS_LESSON.objectives.map(x=><li key={x}>{x}</li>)}</ul></section><small>{result.disclaimer}</small>
 </main>
}
