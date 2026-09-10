(function(global){
  const ENGINE='https://shemsizedek.github.io/neo-system/neo-counter/';
  const OFFICIAL='https://holytemples.org/checkout/';
  const VERSION='1.0.0';
  const money=c=>`$${(c/100).toFixed(2)}`;
  const safeText=v=>String(v??'').slice(0,120);
  const key=id=>`neo-counter-widget-cart:${id||'default'}`;
  function load(id){try{const x=JSON.parse(localStorage.getItem(key(id))||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function save(id,items){localStorage.setItem(key(id),JSON.stringify(items));global.dispatchEvent(new CustomEvent('neo-counter-cart-change',{detail:{cartId:id,items}}));}
  function normalize(item){const amountCents=Number(item.amountCents);if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw new Error('amountCents must be a positive integer');return{id:safeText(item.id||item.sku||crypto.randomUUID()),name:safeText(item.name||'Item'),sku:safeText(item.sku||''),amountCents,qty:Math.max(1,Math.min(99,Number(item.qty)||1))}}
  function cart(id='default'){
    return {
      items:()=>load(id),
      add(item){const next=normalize(item),items=load(id),hit=items.find(x=>x.id===next.id);if(hit)hit.qty=Math.min(99,hit.qty+next.qty);else items.push(next);save(id,items);return items},
      remove(itemId){const items=load(id).map(x=>x.id===itemId?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0);save(id,items);return items},
      clear(){save(id,[]);},
      total(){return load(id).reduce((n,x)=>n+x.amountCents*x.qty,0)},
      count(){return load(id).reduce((n,x)=>n+x.qty,0)},
      checkout(options={}){const items=load(id),amount=items.reduce((n,x)=>n+x.amountCents*x.qty,0);if(!amount)throw new Error('Cart is empty');return launch({...options,amountCents:amount,label:options.label||`${options.merchant||'Store'} · ${items.reduce((n,x)=>n+x.qty,0)} items`})}
    }
  }
  function launch(options={}){
    const amountCents=Number(options.amountCents);if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw new Error('amountCents must be a positive integer');
    const u=new URL(ENGINE);u.searchParams.set('checkout','1');u.searchParams.set('service',safeText(options.service||'external-store'));u.searchParams.set('order',safeText(options.orderId||`cart_${crypto.randomUUID()}`));u.searchParams.set('label',safeText(options.label||'NEO Checkout'));u.searchParams.set('amount',String(amountCents));u.searchParams.set('currency',safeText(options.currency||'USD').toUpperCase());if(options.rail)u.searchParams.set('rail',safeText(options.rail));if(options.asset)u.searchParams.set('asset',safeText(options.asset).toUpperCase());if(Number(options.assetAmount)>0)u.searchParams.set('asset_amount',String(options.assetAmount));if(options.successUrl)u.searchParams.set('success_url',String(options.successUrl));if(options.cancelUrl)u.searchParams.set('cancel_url',String(options.cancelUrl));u.searchParams.set('checkout_origin',OFFICIAL);global.location.assign(u.toString());return u.toString();
  }
  const style=`:host{font-family:Inter,system-ui,sans-serif;color:#111}button{font:inherit;cursor:pointer;border:0;border-radius:12px;padding:12px 16px;font-weight:800}.neo{background:#111;color:#fff}.ghost{background:#eee;color:#111}.card{border:1px solid #ddd;border-radius:16px;background:#fff;padding:16px;box-shadow:0 10px 28px #00000012}.row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:9px 0}.muted{color:#68707d;font-size:12px}.title{font-weight:850}.actions{display:flex;gap:8px;align-items:center}.total{font-size:20px;font-weight:900;margin-top:14px}`;
  class NeoBuy extends HTMLElement{connectedCallback(){const root=this.attachShadow({mode:'open'}),btn=document.createElement('button');btn.className='neo';btn.textContent=this.getAttribute('label')||'Add to cart';btn.onclick=()=>{cart(this.getAttribute('cart-id')||'default').add({id:this.getAttribute('item-id')||this.getAttribute('sku')||undefined,sku:this.getAttribute('sku')||'',name:this.getAttribute('name')||'Item',amountCents:Number(this.getAttribute('amount-cents')),qty:Number(this.getAttribute('qty')||1)});btn.textContent='Added ✓';setTimeout(()=>btn.textContent=this.getAttribute('label')||'Add to cart',900)};root.innerHTML=`<style>${style}</style>`;root.append(btn)}}
  class NeoCheckout extends HTMLElement{connectedCallback(){const root=this.attachShadow({mode:'open'}),btn=document.createElement('button');btn.className='neo';btn.textContent=this.getAttribute('label')||'Checkout';btn.onclick=()=>launch({amountCents:Number(this.getAttribute('amount-cents')),service:this.getAttribute('service')||'external-store',label:this.getAttribute('description')||'NEO Checkout',currency:this.getAttribute('currency')||'USD',rail:this.getAttribute('rail')||undefined,asset:this.getAttribute('asset')||undefined,successUrl:this.getAttribute('success-url')||global.location.href,cancelUrl:this.getAttribute('cancel-url')||global.location.href});root.innerHTML=`<style>${style}</style>`;root.append(btn)}}
  class NeoCart extends HTMLElement{
    connectedCallback(){this.attachShadow({mode:'open'});this.render();this._listener=e=>{if(e.detail?.cartId===(this.getAttribute('cart-id')||'default'))this.render()};global.addEventListener('neo-counter-cart-change',this._listener)}
    disconnectedCallback(){global.removeEventListener('neo-counter-cart-change',this._listener)}
    render(){const id=this.getAttribute('cart-id')||'default',api=cart(id),items=api.items(),root=this.shadowRoot;root.innerHTML=`<style>${style}</style><div class="card"><div class="row"><span class="title">${safeText(this.getAttribute('title')||'Cart')}</span><span class="muted">${api.count()} item${api.count()===1?'':'s'}</span></div>${items.length?items.map(x=>`<div class="row"><div><div>${safeText(x.name)}</div><div class="muted">${x.qty} × ${money(x.amountCents)}</div></div><div class="actions"><button class="ghost" data-remove="${safeText(x.id)}">−</button><b>${money(x.amountCents*x.qty)}</b></div></div>`).join(''):'<div class="muted">Your cart is empty.</div>'}<div class="row total"><span>Total</span><span>${money(api.total())}</span></div><button class="neo" data-checkout ${items.length?'':'disabled'}>${safeText(this.getAttribute('checkout-label')||'Checkout')}</button></div>`;root.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>api.remove(b.getAttribute('data-remove'))));root.querySelector('[data-checkout]')?.addEventListener('click',()=>api.checkout({merchant:this.getAttribute('merchant')||'Store',service:this.getAttribute('service')||'external-store',currency:this.getAttribute('currency')||'USD',rail:this.getAttribute('rail')||undefined,asset:this.getAttribute('asset')||undefined,successUrl:this.getAttribute('success-url')||global.location.href,cancelUrl:this.getAttribute('cancel-url')||global.location.href}))}
  }
  if(!customElements.get('neo-counter-buy'))customElements.define('neo-counter-buy',NeoBuy);
  if(!customElements.get('neo-counter-checkout'))customElements.define('neo-counter-checkout',NeoCheckout);
  if(!customElements.get('neo-counter-cart'))customElements.define('neo-counter-cart',NeoCart);
  global.NEOCounterWidgets=Object.freeze({version:VERSION,officialCheckout:OFFICIAL,engine:ENGINE,cart,launch});
})(window);
