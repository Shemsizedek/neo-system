import test from 'node:test';
import assert from 'node:assert/strict';
import { academyCatalog, academyDashboard, fiveYearPlanningCase, projectTuition } from './science-temple-academy.mjs';
test('academy catalog remains proposed', () => { assert.equal(academyCatalog().enrollmentStatus,'not_open'); });
test('tuition is discounted correctly', () => { assert.equal(projectTuition({students:144,annualTuition:15500}).modeledNetTuition,1785600); });
test('five-year planning case has five years', () => { assert.equal(fiveYearPlanningCase().length,5); });
test('dashboard requires both identity and authorization', () => { assert.throws(()=>academyDashboard({role:'student',authenticated:true}),/academy_access_denied/); });
test('dashboard does not expose live student records', () => { const d=academyDashboard({role:'guardian',authenticated:true,authorized:true}); assert.equal(d.syntheticDataOnly,true); assert.equal(d.readOnly,true); });
