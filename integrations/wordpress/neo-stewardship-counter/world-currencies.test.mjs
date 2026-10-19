import assert from 'node:assert/strict';
import {filterCurrencyRows} from './world-currencies.mjs';
assert.deepEqual(filterCurrencyRows(['SGC Singap Cash', 'SGC Shilling Cash', 'NMNI Nomni NOMNI'], 'SGC'), [true,true,false]);
assert.deepEqual(filterCurrencyRows(['SGC Singap Cash', 'SGC Shilling Cash', 'NMNI Nomni NOMNI'], ' shilling '), [false,true,false]);
assert.deepEqual(filterCurrencyRows(['NMNI Nomni NOMNI'], '<script>'), [false]);
assert.deepEqual(filterCurrencyRows(['one','two'], ''), [true,true]);
console.log('PASS: currency search preserves duplicate symbols and safely matches text');
