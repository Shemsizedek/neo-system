import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NEO_REALTY_SELLER_SESSION_SECRET='seller-test-secret';
const { verifySellerBearer } = await import('./seller-auth.js');

const payload=Buffer.from(JSON.stringify({sub:'seller-144',role:'seller',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
const signature=crypto.createHmac('sha256',process.env.NEO_REALTY_SELLER_SESSION_SECRET).update(payload).digest('base64url');
const principal=verifySellerBearer(`Bearer ${payload}.${signature}`);
assert.deepEqual(principal,{id:'seller-144',role:'seller'});
assert.equal(verifySellerBearer(`Bearer ${payload}.tampered`),null);
const expired=Buffer.from(JSON.stringify({sub:'seller-144',role:'seller',exp:1})).toString('base64url');
const expiredSig=crypto.createHmac('sha256',process.env.NEO_REALTY_SELLER_SESSION_SECRET).update(expired).digest('base64url');
assert.equal(verifySellerBearer(`Bearer ${expired}.${expiredSig}`),null);
console.log('NEO Realty seller session test passed');
