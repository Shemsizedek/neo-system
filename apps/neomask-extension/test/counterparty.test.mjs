import assert from 'node:assert/strict';
import {bitcoin,ECPair,reviewPsbt,psbtDigest,signReviewedPsbt} from '../src/wallet.mjs';
import {buildBondPsbt,encodeBondMessage,arc4} from '../src/counterparty.mjs';
import {Buffer} from 'buffer';
const key=ECPair.fromPrivateKey(Buffer.alloc(32,3)),receiver=ECPair.fromPrivateKey(Buffer.alloc(32,4));
const source=bitcoin.payments.p2pkh({pubkey:key.publicKey}).address;
const destination=bitcoin.payments.p2pkh({pubkey:receiver.publicKey}).address;
const previous=new bitcoin.Transaction();previous.addInput(Buffer.alloc(32),0xffffffff);previous.addOutput(bitcoin.address.toOutputScript(source),50000n);
for(const ledger of ['classic','cp20']){
 for(const asset of ['PLEDGEBOND','TEMPLEBOND']){
  const options={asset,ledger,quantityAtomic:'100000000',source,destination,inputs:[{previousTx:previous.toHex(),index:0}],feeSats:'2000'};
  const hex=buildBondPsbt(options),review=reviewPsbt(hex,source,ledger);
  assert.equal(review.assetTransfer.asset,asset);assert.equal(review.assetTransfer.destination,destination);assert.equal(review.assetTransfer.quantityAtomic,'100000000');assert.equal(review.feeSats,'2000');
  assert.throws(()=>reviewPsbt(hex,source,ledger==='classic'?'cp20':'classic'));
  const signed=await signReviewedPsbt({hex,wif:key.toWIF(),approvedDigest:await psbtDigest(hex),ledger});
  assert(bitcoin.Transaction.fromHex(signed.rawTx).ins[0].script.length>0);
  const psbt=bitcoin.Psbt.fromHex(hex);psbt.addOutput({address:destination,value:11000n});
  assert.throws(()=>reviewPsbt(psbt.toHex(),source,ledger));
  const message=encodeBondMessage(options);message[8]=4;
  const encrypted=arc4(Buffer.from(bitcoin.Psbt.fromHex(hex).txInputs[0].hash).reverse(),message);
  const sweep=new bitcoin.Psbt();sweep.addInput({hash:previous.getId(),index:0,nonWitnessUtxo:previous.toBuffer()});sweep.addOutput({script:bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,encrypted]),value:0n});sweep.addOutput({address:source,value:48000n});
  assert.throws(()=>reviewPsbt(sweep.toHex(),source,ledger));
 }
}
console.log('PASS: actual signing of both bonds on Classic binary and 2.0 CBOR, exact asset/quantity/destination review, wrong-ledger rejection, diverted BTC and sweep rejection');

