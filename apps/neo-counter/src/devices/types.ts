export type DeviceKind = 'BARCODE_SCANNER' | 'RECEIPT_PRINTER' | 'PAYMENT_TERMINAL';
export type DeviceStatus = 'disconnected' | 'pairing' | 'ready' | 'error';

export type PairedDevice = {
  id: string;
  name: string;
  kind: DeviceKind;
  status: DeviceStatus;
  transport: 'webusb' | 'webserial' | 'webbluetooth' | 'mock';
  pairedAt: string;
};

export type ReceiptPayload = {
  merchantName: string;
  transactionId: string;
  totalUsd: number;
  rail: string;
  createdAt: string;
};

export interface BarcodeScannerAdapter {
  readonly kind: 'BARCODE_SCANNER';
  pair(): Promise<PairedDevice>;
  read(): Promise<string>;
}

export interface ReceiptPrinterAdapter {
  readonly kind: 'RECEIPT_PRINTER';
  pair(): Promise<PairedDevice>;
  print(receipt: ReceiptPayload): Promise<void>;
}

export interface PaymentTerminalAdapter {
  readonly kind: 'PAYMENT_TERMINAL';
  pair(): Promise<PairedDevice>;
  capabilities(): Promise<Array<'NFC' | 'EMV' | 'MSR'>>;
}
