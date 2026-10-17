export function parseWalletQR(raw) {
  const text = raw.trim();
  const address = text.toLowerCase().startsWith('bitcoin:') ? decodeURIComponent(text.slice(8).split('?')[0]) : text;
  if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) throw new Error('Use a mainnet legacy Counterparty wallet address beginning with 1. Other address types are not enabled in this release.');
  return address;
}
export function mountWalletScanner(root) {
  const start = root.querySelector('[data-scan-wallet]');
  const stop = root.querySelector('[data-stop-scan]');
  const video = root.querySelector('video');
  const status = root.querySelector('[data-scan-status]');
  const input = root.querySelector('[name=wallet]');
  let stream, frame, running = false;
  const close = () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    if (stream) stream.getTracks().forEach(track=>track.stop());
    stream = undefined; video.srcObject = null; video.hidden = true; stop.hidden = true;
  };
  stop.addEventListener('click',()=>{close();status.textContent='Scanner stopped. You can paste your wallet address.';});
  start.addEventListener('click',async()=>{
    close();
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      status.textContent='QR scanning is unavailable in this browser. Paste your wallet address below.';return;
    }
    try {
      const detector = new BarcodeDetector({formats:['qr_code']});
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      video.srcObject = stream; video.hidden = false; stop.hidden = false;
      await video.play();running=true; status.textContent='Scan the receiving address from your Counterparty wallet.';
      const tick = async()=>{
        if (!running) return;
        try {
          const codes = await detector.detect(video);
          if (!running) return;
          if (codes.length) {
            input.value = parseWalletQR(codes[0].rawValue);
            close();status.textContent='Wallet scanned. Check the address carefully before submitting.';return;
          }
        } catch (e) { close();status.textContent=e.message || 'Scan failed. Paste your address.';return; }
        if (running) frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    } catch {close();status.textContent='Camera unavailable. Paste your wallet address below.';}
  });
  window.addEventListener('pagehide',close);
}
