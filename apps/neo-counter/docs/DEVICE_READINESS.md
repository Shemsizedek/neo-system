# NEO Counter Device Readiness

This layer prepares NEO Counter for certified POS peripherals without granting payment authority to the browser.

## Device abstractions

NEO Counter now defines interfaces for:

- barcode scanners
- receipt printers
- payment terminals exposing NFC / EMV / MSR capability metadata

The current implementation ships only mock adapters. They are intentionally non-transactional and do not read cardholder data, authorize cards, sign blockchain transactions, or custody funds.

## Integration boundary

Future production hardware must connect behind these interfaces through certified vendor SDKs or browser-safe transports where appropriate. Raw PAN/card data must never be exposed to NEO Counter application code. EMV/NFC payment authorization belongs to a compliant processor/terminal SDK.

## Pairing model

A paired device record contains only device metadata: id, display name, device kind, transport, readiness status, and pairing timestamp. No payment credentials are stored.

## Next production adapters

1. Barcode: WebHID/WebUSB or vendor SDK where supported.
2. Receipt printer: WebUSB/WebSerial or vendor print bridge.
3. NFC/EMV: processor-certified terminal SDK. NEO Counter receives tokens/status events only, never raw card data.
