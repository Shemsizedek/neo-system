import type { BarcodeScannerAdapter, PairedDevice, PaymentTerminalAdapter, ReceiptPayload, ReceiptPrinterAdapter } from './types';

function paired(name:string,kind:PairedDevice['kind']):PairedDevice{
  return {id:crypto.randomUUID(),name,kind,status:'ready',transport:'mock',pairedAt:new Date().toISOString()};
}

export class MockBarcodeScanner implements BarcodeScannerAdapter{
  readonly kind='BARCODE_SCANNER' as const;
  async pair(){return paired('NEO Scanner Simulator','BARCODE_SCANNER');}
  async read(){return 'NEO-144-TEST';}
}

export class MockReceiptPrinter implements ReceiptPrinterAdapter{
  readonly kind='RECEIPT_PRINTER' as const;
  async pair(){return paired('NEO Receipt Printer Simulator','RECEIPT_PRINTER');}
  async print(receipt:ReceiptPayload){console.info('[NEO Counter receipt simulator]',receipt);}
}

export class MockPaymentTerminal implements PaymentTerminalAdapter{
  readonly kind='PAYMENT_TERMINAL' as const;
  async pair(){return paired('NEO NFC/EMV Terminal Simulator','PAYMENT_TERMINAL');}
  async capabilities():Promise<('NFC'|'EMV'|'MSR')[]>{return ['NFC','EMV','MSR'];}
}
