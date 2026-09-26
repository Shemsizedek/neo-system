import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectInstagramRuntime,
  bindRudwaanInstagramAccount,
} from './rudwaan-instagram-runtime.mjs';

test('runtime remains closed when no Instagram account is authorized', () => {
  const h = inspectInstagramRuntime({
    connector: {id:'instagram',actions:['reply_to_comment'],accounts:[]},
  });
  assert.equal(h.ready, false);
  assert.equal(h.requiredAction, 'authorize_instagram_oauth');
});

test('runtime opens only when account and reply capability exist', () => {
  const h = inspectInstagramRuntime({
    connector: {id:'instagram',actions:['reply_to_comment'],accounts:[{id:'123',name:'NEO IG'}]},
  });
  assert.equal(h.ready, true);
  const b = bindRudwaanInstagramAccount(h,'123');
  assert.equal(b.accountId,'123');
  assert.equal(b.privilegedExecution,false);
});
