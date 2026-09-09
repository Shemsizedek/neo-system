const params=new URLSearchParams(window.location.search);
const state=params.get('settlement_state');

if(state){
  const confirmed=params.get('settlement_confirmed')==='1';
  const reference=params.get('reference');
  const paymentId=params.get('payment_id');
  const informational=state==='SETTLED'&&confirmed&&Boolean(reference)
    ? 'Returned as confirmed. Independently verify the blockchain reference before relying on this status.'
    : 'This browser return is informational only and is not payment proof.';

  window.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('section');
    banner.setAttribute('aria-label','NEO Counter settlement return');
    banner.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;padding:14px 16px;border:1px solid #315341;border-radius:12px;background:#07110c;color:#d9ffe3;font:13px/1.45 system-ui,sans-serif;box-shadow:0 10px 35px rgba(0,0,0,.4)';
    const ref=reference?` · reference ${reference}`:'';
    const pid=paymentId?` · payment ${paymentId}`:'';
    banner.textContent=`NEO Counter return: ${state}${confirmed?' · confirmed':' · unconfirmed'}${pid}${ref}. ${informational}`;
    document.body.appendChild(banner);
  });
}
