# Local QR encoder

`qrcodegen.mjs` is compiled from Project Nayuki's MIT-licensed TypeScript QR generator at commit `bcfe1b018cec5f1f91b5705eca5bb4cdd34e9f8d`:
https://github.com/nayuki/QR-Code-generator/blob/bcfe1b018cec5f1f91b5705eca5bb4cdd34e9f8d/typescript-javascript/qrcodegen.ts

The original license is retained in the file. The only addition after compilation is `export { qrcodegen };`. QR generation stays on the device: no invoice address is sent to an image/QR service. SVG rendering uses a four-module quiet zone and black modules on white.
