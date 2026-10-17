import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/icons',{recursive:true});
for(const n of [16,32,48,128])await copyFile('icons/neomask-'+n+'.png','dist/icons/neomask-'+n+'.png');
for(const [source,target] of [['src/background.mjs','background.mjs'],['src/popup.mjs','popup.mjs'],['src/vault-ui.mjs','vault-ui.mjs']]){
 await build({entryPoints:[source],bundle:true,format:'esm',platform:'browser',target:'chrome111',outfile:'dist/'+target,inject:['src/buffer-shim.mjs'],legalComments:'eof',minify:false});
}
for(const name of ['manifest.json','provider.js','content.js','popup.html','vault.html','popup.css'])await copyFile(name,'dist/'+name);
console.log('Built NeoMask 0.3.0 extension in dist/');
