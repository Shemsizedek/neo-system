import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';

const root = resolve('public/neo-cloud-miner');
const out = resolve('build/neo-generator-preview/browser-qa');
await mkdir(out,{recursive:true});
const allowed = new Set(['index.html','styles.css','core.js','app.js']);
const server = http.createServer(async(req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (!allowed.has(file)) {res.writeHead(404);res.end();return;}
  try {
    const content = await readFile(join(root,file));
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html';
    res.writeHead(200,{'content-type':type,'cache-control':'no-store'});res.end(content);
  } catch {res.writeHead(500);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(),'neo-cloud-browser-'));
const chrome = spawn(process.env.CHROME_BINARY || 'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let socket;let sequence = 0;let session;const pending = new Map();
const report = {checks:[],pageErrors:[]};
try {
  const endpoint = await new Promise((resolveEndpoint,reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error('Chrome debugging endpoint unavailable')),20000);
    chrome.once('error',error => {clearTimeout(timer);reject(error);});
    chrome.stderr.on('data',chunk => {log += chunk;const found = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(found){clearTimeout(timer);resolveEndpoint(found[1]);}});
  });
  socket = new WebSocket(endpoint);await once(socket,'open');
  socket.addEventListener('message',event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const pair = pending.get(message.id);pending.delete(message.id);
      if(message.error) pair.reject(new Error(message.error.message));else pair.resolve(message.result);
    }
    if(message.method === 'Runtime.exceptionThrown') report.pageErrors.push(message.params.exceptionDetails.text);
  });
  const send = (method,params={},scoped=true) => new Promise((resolveResult,reject) => {
    const id = ++sequence;pending.set(id,{resolve:resolveResult,reject});
    const message = {id,method,params};if(scoped && session) message.sessionId=session;
    socket.send(JSON.stringify(message));
  });
  const target = await send('Target.createTarget',{url:'about:blank'},false);
  session = (await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId;
  await send('Page.enable');await send('Runtime.enable');
  const evaluate = async expression => {
    const value = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
    if(value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
    return value.result.value;
  };
  const waitFor = async expression => {
    for(let attempt=0;attempt<100;attempt++){if(await evaluate(expression))return;await new Promise(resolveWait=>setTimeout(resolveWait,100));}
    throw new Error(`Browser condition timed out: ${expression}`);
  };
  const screenshot = async name => {
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize;
    const image = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(size.width),height:Math.ceil(size.height),scale:1}});
    await writeFile(join(out,name),Buffer.from(image.data,'base64'));
  };
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/'});
  await waitFor("document.querySelector('[data-nav=overview]')?.classList.contains('active')");
  assert.equal(await evaluate('document.querySelectorAll(".draft-card").length'),0);
  await screenshot('desktop-overview.png');report.checks.push('Desktop overview renders from shipped module assets');
  await evaluate("location.hash='plans'");await waitFor("!document.getElementById('view-plans').hidden");
  await evaluate(`(() => {document.querySelector('[data-hashrate="500"]').click();const t=document.getElementById('term');t.value='90';t.dispatchEvent(new Event('input'));const r=document.getElementById('rail');r.value='NOMNI';r.dispatchEvent(new Event('input'));document.getElementById('asset').value='EXAMPLE.ASSET';document.getElementById('acknowledge').checked=true;return true;})()`);
  assert.equal(await evaluate("document.getElementById('summary-hash').textContent"),'500');
  assert.equal(await evaluate("document.querySelector('.plan-summary button').disabled"),true);
  await screenshot('desktop-plan.png');
  await evaluate("document.getElementById('plan-form').requestSubmit()");
  await waitFor("document.querySelectorAll('.draft-card').length===1 && !document.getElementById('view-contracts').hidden");
  report.checks.push('Plan form creates a local-only 500 TH/s draft; real checkout remains disabled');
  await send('Page.reload');await waitFor("document.querySelectorAll('.draft-card').length===1");
  report.checks.push('Local draft survives a full page reload');
  await evaluate("document.querySelector('.draft-actions button').click()");
  const exported = JSON.parse(await evaluate("document.getElementById('export-value').value"));
  assert.equal(exported.state,'LOCAL_DRAFT');assert.equal(exported.paymentVerified,false);assert.equal(exported.tokenIssued,false);assert.equal(exported.miningVerified,false);
  report.checks.push('Export preserves draft status with no payment, mining or token issuance');
  await evaluate("document.getElementById('close-export').click()");
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const route of ['overview','plans','contracts','connections']) {
    await evaluate(`location.hash=${JSON.stringify(route)}`);
    await waitFor(`!document.getElementById('view-${route}').hidden`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Horizontal overflow in ${route}`);
    await screenshot(`mobile-${route}.png`);
  }
  report.checks.push('All four mobile views render at 390px without horizontal overflow');
  await evaluate("location.hash='contracts'");await waitFor("!document.getElementById('view-contracts').hidden");
  await evaluate("window.confirm=()=>true;document.querySelectorAll('.draft-actions button')[1].click()");
  assert.equal(await evaluate("document.querySelectorAll('.draft-card').length"),0);
  report.checks.push('Confirmed local deletion removes only the selected draft');
  assert.deepEqual(report.pageErrors,[]);
  report.checks.push('No JavaScript runtime exceptions during browser checks');
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if(socket)socket.close();chrome.kill('SIGTERM');server.close();
  await new Promise(resolveWait=>setTimeout(resolveWait,400));
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
