import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, dirname, resolve} from 'node:path';
import {createCardmasterCollection, renderCardmasterSvg} from '../server/crown-metadata/cardmaster-gallery.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'apps/neoscan/web/cardmaster');
const art=join(out,'art');
const deck=createCardmasterCollection();
await mkdir(art,{recursive:true});
await writeFile(join(out,'catalog.js'),'// Offline preview only. Not a live market feed.\nwindow.NEO_CROWN_CATALOG = '+JSON.stringify(deck,null,2)+';\n','utf8');
for(const card of deck.cards){
  for(const face of ['front','back'])await writeFile(join(art,card.card_id+'-'+face+'.svg'),renderCardmasterSvg(card,{face})+'\n','utf8');
}
console.log('Generated '+deck.cards.length+' CARDMASTER SVG pairs and offline catalog at '+out);
