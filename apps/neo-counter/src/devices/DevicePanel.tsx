import { useState } from 'react';
import { MockBarcodeScanner, MockPaymentTerminal, MockReceiptPrinter } from './mock';
import type { PairedDevice } from './types';

const scanner=new MockBarcodeScanner();
const printer=new MockReceiptPrinter();
const terminal=new MockPaymentTerminal();

export default function DevicePanel(){
  const [devices,setDevices]=useState<PairedDevice[]>([]);
  const [scan,setScan]=useState('');
  const [message,setMessage]=useState('Device simulators are safe test adapters; no card data is read.');

  const addDevice=(device:PairedDevice)=>setDevices(current=>[device,...current.filter(item=>item.kind!==device.kind)]);
  const pairScanner=async()=>{addDevice(await scanner.pair());setMessage('Barcode scanner simulator paired.');};
  const pairPrinter=async()=>{addDevice(await printer.pair());setMessage('Receipt printer simulator paired.');};
  const pairTerminal=async()=>{const device=await terminal.pair();const caps=await terminal.capabilities();addDevice(device);setMessage(`Terminal simulator paired: ${caps.join(', ')} capability metadata available.`);};
  const testScan=async()=>{setScan(await scanner.read());setMessage('Test barcode captured and ready for catalog lookup.');};
  const testReceipt=async()=>{await printer.print({merchantName:'NEO Merchant #144',transactionId:`test_${crypto.randomUUID()}`,totalUsd:1.44,rail:'TEST',createdAt:new Date().toISOString()});setMessage('Test receipt sent to the printer adapter.');};

  return <section className="panel device-panel">
    <div className="section-head"><div><h2>Devices & Terminal</h2><small>Hardware readiness layer</small></div><span>{devices.length} paired</span></div>
    <div className="device-grid">
      <article><strong>Barcode scanner</strong><p>Catalog SKU/UPC input.</p><button onClick={pairScanner}>Pair Scanner</button><button onClick={testScan}>Test Scan</button>{scan&&<code>{scan}</code>}</article>
      <article><strong>Receipt printer</strong><p>Receipt-output abstraction.</p><button onClick={pairPrinter}>Pair Printer</button><button onClick={testReceipt}>Test Receipt</button></article>
      <article><strong>NFC / EMV terminal</strong><p>Capability discovery only. No raw card data.</p><button onClick={pairTerminal}>Pair Terminal</button></article>
    </div>
    {devices.length>0&&<div className="paired-list">{devices.map(device=><div key={device.id}><span>{device.name}</span><b>{device.kind.replaceAll('_',' ')}</b><em>{device.status}</em></div>)}</div>}
    <p className="device-message">{message}</p>
  </section>;
}
