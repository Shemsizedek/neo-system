import test from 'node:test';import assert from 'node:assert/strict';
import {createNomniVerificationPanel} from './nomni-verification-panel.mjs';
function fake(){const e={children:[],textContent:'',className:'',setAttribute(){},append(...children){this.children.push(...children)}};return Object.assign({},e);}
test('panel uses textContent and does not report invented prices',()=>{
 const panel=createNomniVerificationPanel({createElement:fake},{counterpartyObservation:{asset:'NOMNI',verification_status:'provider_observed_unconfirmed',source_claims:{issuer_address:'fixture'}}});
 const text=panel.children.map(x=>x.textContent||x.children.map(y=>y.textContent).join(' ')).join(' ');
 assert.match(text,/Backing not independently verified/);assert.match(text,/No calculated NOMNI index level/);
 assert.doesNotMatch(text,/\$100|Guaranteed/);
});
