import test from 'node:test'
import assert from 'node:assert/strict'
import {estateRoute,renderEstateApp} from './estate-app.mjs'
test('estate route is canonical',()=>{assert.equal(estateRoute(new URL('https://neo.holytemples.org/estate/')),true)})
test('estate surface preserves legal boundary',()=>{const html=renderEstateApp();assert.match(html,/Global Vast Estate/);assert.match(html,/does not by itself establish, adjudicate, or validate legal trust status/)})
