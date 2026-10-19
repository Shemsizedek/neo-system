import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../apps/neomask-extension/package.json',import.meta.url));
const {build}=require('esbuild');
await build({entryPoints:[fileURLToPath(new URL('./freewallet-popup.mjs',import.meta.url))],bundle:true,inject:[fileURLToPath(new URL('./buffer-shim.mjs',import.meta.url))],preserveSymlinks:true,platform:'browser',format:'iife',globalName:'NeoMaskFreewallet',outfile:fileURLToPath(new URL('./dist/freewallet-bridge.js',import.meta.url)),legalComments:'eof'});
