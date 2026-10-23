import test from 'node:test'
import assert from 'node:assert/strict'
import {createInstitution,createAccount,validateSegregation,createPositionRecord,createCollateralRecord,eligibleCollateralValue,createFinancingRecord,createBorrowLendInventory,buildCrossMarginView,createInstitutionalStatement,createAccountEvidence,primeSnapshot} from './fabric.mjs'

test('account fabric never stores private keys',()=>{const a=createAccount({account_id:'a',institution_id:'i',account_type:'MASTER'});assert.equal(a.private_keys_stored,false)})
test('collateral account must be segregated under parent',()=>{const a=createAccount({account_id:'c',institution_id:'i',account_type:'COLLATERAL'});assert.equal(validateSegregation([a]).valid,false)})
test('eligible collateral applies haircut',()=>{const c=createCollateralRecord({collateral_id:'c',account_id:'a',asset:'BTC',market_value:100,haircut_bps:1000});assert.equal(eligibleCollateralValue([c]),90)})
test('financing and borrow lend remain non-executing records',()=>{assert.equal(createFinancingRecord({financing_id:'f',account_id:'a',asset:'BTC'}).status,'RECORDED_NOT_EXECUTED');assert.equal(createBorrowLendInventory({inventory_id:'i',account_id:'a',asset:'BTC'}).status,'VIEW_ONLY')})
test('cross margin is view only',()=>{const a=createAccount({account_id:'a',institution_id:'i',account_type:'PORTFOLIO',portfolio_id:'p'}),p=createPositionRecord({account_id:'a',asset:'BTC',market_value:100});assert.equal(buildCrossMarginView({accounts:[a],positions:[p]}).view_only,true)})
test('statement excludes private keys and has digest',()=>{const i=createInstitution({institution_id:'i',name:'Inst'}),s=createInstitutionalStatement({institution:i});assert.equal(s.private_keys_included,false);assert.equal(typeof s.digest,'string')})
test('snapshot preserves authority boundary',()=>{assert.match(primeSnapshot({}).authority_boundary,/does not establish external prime-broker/)})
