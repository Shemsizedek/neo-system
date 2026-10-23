import test from 'node:test';import assert from 'node:assert/strict'
import {createInstitution,createAccount,validateSegregation,createPositionRecord,createCollateralRecord,eligibleCollateralValue,createFinancingRecord,createBorrowLendInventory,buildCrossMarginView,createInstitutionalStatement,primeAccountSnapshot} from './fabric.mjs'
test('keys are never stored',()=>assert.equal(createAccount({account_id:'a',institution_id:'i',account_type:'MASTER'}).private_keys_stored,false))
test('collateral segregation enforced',()=>assert.equal(validateSegregation([createAccount({account_id:'c',institution_id:'i',account_type:'COLLATERAL'})]).valid,false))
test('haircuts apply',()=>assert.equal(eligibleCollateralValue([createCollateralRecord({collateral_id:'c',account_id:'a',asset:'BTC',market_value:100,haircut_bps:1000})]),90))
test('financing and lending remain records only',()=>{assert.equal(createFinancingRecord({financing_id:'f',account_id:'a',asset:'BTC'}).status,'RECORDED_NOT_EXECUTED');assert.equal(createBorrowLendInventory({inventory_id:'i',account_id:'a',asset:'BTC'}).status,'VIEW_ONLY')})
test('cross margin remains view only',()=>{const a=createAccount({account_id:'a',institution_id:'i',account_type:'PORTFOLIO',portfolio_id:'p'}),p=createPositionRecord({account_id:'a',asset:'BTC',market_value:100});assert.equal(buildCrossMarginView({accounts:[a],positions:[p]}).view_only,true)})
test('statements exclude keys',()=>{const i=createInstitution({institution_id:'i',name:'Inst'});assert.equal(createInstitutionalStatement({institution:i}).private_keys_included,false)})
test('authority boundary explicit',()=>assert.match(primeAccountSnapshot({}).authority_boundary,/does not establish external prime-broker/))
