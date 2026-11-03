import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../../public/gods-eye/globe.mjs';
test('projection centers selected longitude and hides far hemisphere',()=>{
 assert.deepEqual(project(-79,0,-79),{x:200,y:200,visible:true});
 assert.equal(project(101,0,-79).visible,false);
 assert.ok(Math.abs(project(0,90).y-30)<1e-8);
});
