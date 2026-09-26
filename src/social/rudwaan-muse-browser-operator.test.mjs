import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMuseBrowserTask,
  acceptMuseBrowserResult,
} from './rudwaan-muse-browser-operator.mjs';

test('builds a supervised browser task', () => {
  const task = buildMuseBrowserTask({
    taskClass:'web_research',
    objective:'Review the current Instagram AI Studio settings for Rudwaan',
    returnFields:['settings','limitations'],
  });
  assert.equal(task.mode,'operator-side-browser');
  assert.equal(task.execution.humanSupervisionRequired,true);
  assert.equal(task.execution.directApi,false);
});

test('rejects unsupported task classes', () => {
  assert.throws(() => buildMuseBrowserTask({
    taskClass:'financial_execution',
    objective:'Move funds',
  }), /unsupported_muse_browser_task/);
});

test('browser result is non-canonical without Nous receipt', () => {
  const task = buildMuseBrowserTask({
    taskClass:'instagram_native_review',
    objective:'Inspect Rudwaan public settings',
  });
  const result = acceptMuseBrowserResult({task,result:{ok:true}});
  assert.equal(result.canonical,false);
});

test('browser result becomes canonical only with Nous receipt', () => {
  const task = buildMuseBrowserTask({
    taskClass:'meta_business_review',
    objective:'Inspect Meta business context',
  });
  const result = acceptMuseBrowserResult({
    task,
    result:{ok:true},
    nousReceipt:'neo-receipt-008',
  });
  assert.equal(result.canonical,true);
});
