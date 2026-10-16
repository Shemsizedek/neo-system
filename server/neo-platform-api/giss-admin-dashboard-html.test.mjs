import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGisdAdminDashboard } from './giss-admin-dashboard-html.mjs';
import { createSuperintendentDashboardView } from './giss-superintendent-dashboard.mjs';

const actor={subjectId:'admin',memberships:[{institutionId:'temple-a',role:'institution_admin',active:true}]};
test('renders only authorized institution reports',()=>{
 const view=createSuperintendentDashboardView({actor,institutionId:'temple-a',institution:{id:'temple-a',name:'Temple A'},reporting:[
  {id:'a',institutionId:'temple-a',visibility:'institution',title:'Attendance',status:'draft'},
  {id:'b',institutionId:'church-b',visibility:'institution',title:'Other institution confidential',status:'draft'}
 ]});
 const html=renderGisdAdminDashboard(view);
 assert.match(html,/Attendance/);
 assert.doesNotMatch(html,/Other institution confidential/);
 assert.match(html,/NEO Cipher Admin Dashboard/);
});
test('denies unauthorized dashboard',()=>assert.match(renderGisdAdminDashboard({allowed:false}),/Access denied/));
test('escapes untrusted reporting text',()=>{
 const html=renderGisdAdminDashboard({allowed:true,institutionId:'a',institutionName:'<script>alert(1)</script>',registry:{positions:[]},reports:[{title:'<img src=x onerror=alert(1)>',status:'draft'}]});
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;script&gt;/);
});
