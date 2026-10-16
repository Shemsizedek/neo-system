import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDealDeskDashboard } from './dashboard.mjs';

test('dashboard exposes pipeline and approval queue',()=>{
  const html=renderDealDeskDashboard({
    opportunities:[{normalized:{organization:'Example Org'},opportunity:{dealClass:'institutional_saas',stage:'draft_ready',qualification:{score:84,grade:'A'},quote:{ask:100000}}}],
    approvalQueue:[{prospect:{organization:'Investor Co'},reasons:['securities_solicitation']}],
    asOf:'2026-09-23T12:00:00Z'
  });
  assert.match(html,/NEO Deal Desk/);
  assert.match(html,/Example Org/);
  assert.match(html,/Investor Co/);
  assert.match(html,/84\/100/);
});
