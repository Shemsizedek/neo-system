import type { MerchantOpsState, StaffPermission } from './types';

type Props={state:MerchantOpsState;onChange:(next:MerchantOpsState)=>void};
const permissions:StaffPermission[]=['register','refunds','catalog','devices','reports','settings'];

export default function MerchantOpsPanel({state,onChange}:Props){
  const merchant=state.merchant;
  const location=state.locations.find(x=>x.id===state.activeLocationId) || state.locations[0];
  const tax=state.taxRules.find(x=>x.id===location?.taxRuleId) || state.taxRules[0];
  const receipt=state.receiptTemplates.find(x=>x.id===state.activeReceiptTemplateId) || state.receiptTemplates[0];
  const patchMerchant=(patch:Partial<typeof merchant>)=>onChange({...state,merchant:{...merchant,...patch}});
  const patchTax=(patch:Partial<typeof tax>)=>onChange({...state,taxRules:state.taxRules.map(x=>x.id===tax.id?{...x,...patch}:x)});
  const patchReceipt=(patch:Partial<typeof receipt>)=>onChange({...state,receiptTemplates:state.receiptTemplates.map(x=>x.id===receipt.id?{...x,...patch}:x)});
  return <section className="panel merchant-ops">
    <div className="section-head"><h2>Merchant Operations</h2><span>{location?.name}</span></div>
    <div className="ops-grid">
      <div className="ops-card"><h3>Merchant</h3><label>Name<input value={merchant.name} onChange={e=>patchMerchant({name:e.target.value})}/></label><label>Support email<input value={merchant.supportEmail||''} onChange={e=>patchMerchant({supportEmail:e.target.value})}/></label><label>Currency<input value={merchant.currency} onChange={e=>patchMerchant({currency:e.target.value.toUpperCase()})}/></label></div>
      <div className="ops-card"><h3>Tax</h3><label>Rule<input value={tax.name} onChange={e=>patchTax({name:e.target.value})}/></label><label>Rate %<input type="number" step="0.01" value={(tax.rate*100).toFixed(2)} onChange={e=>patchTax({rate:Number(e.target.value)/100})}/></label><label className="check"><input type="checkbox" checked={tax.enabled} onChange={e=>patchTax({enabled:e.target.checked})}/>Enabled</label></div>
      <div className="ops-card"><h3>Receipt</h3><label>Header<input value={receipt.header} onChange={e=>patchReceipt({header:e.target.value})}/></label><label>Footer<textarea value={receipt.footer} onChange={e=>patchReceipt({footer:e.target.value})}/></label></div>
      <div className="ops-card"><h3>Terminals</h3>{state.terminalAssignments.map(t=><div className="ops-row" key={t.terminalId}><div><strong>{t.label}</strong><small>{t.terminalId}</small></div><span>{t.enabled?'Assigned':'Disabled'}</span></div>)}</div>
      <div className="ops-card wide"><h3>Inventory / SKU / Barcode</h3>{state.catalog.map(item=><div className="ops-row inventory-row" key={item.id}><div><strong>{item.name}</strong><small>{item.sku} · {item.barcode||'No barcode'}</small></div><span>{item.inventoryTracked?`${item.quantity} in stock`:'Not tracked'}</span></div>)}</div>
      <div className="ops-card wide"><h3>Staff & Register Permissions</h3>{state.staff.map(member=><div className="staff-row" key={member.id}><div><strong>{member.name}</strong><small>{member.role}</small></div><div className="perm-list">{permissions.map(p=><span key={p} className={member.permissions.includes(p)?'granted':'denied'}>{p}</span>)}</div></div>)}</div>
    </div>
  </section>
}
