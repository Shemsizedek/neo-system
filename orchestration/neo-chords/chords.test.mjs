import test from 'node:test';
import assert from 'node:assert/strict';
import { createChordsOrchestrator } from './chords.mjs';

const task = (id, capability = 'research', overrides = {}) => ({
  id, capability, kind: 'research', prompt: `work on ${id}`, dataClass: 'public', ...overrides
});
const worker = (id, capabilities, run = async x => `${id}:${x.id}`) => ({
  id, capabilities, dataClasses: ['public'], run
});

test('dispatches independent tasks to explicit capability workers and records redacted audit', async () => {
  const events = [];
  const chords = createChordsOrchestrator({
    workers: [worker('claude-mock', ['analyze']), worker('perplexity-mock', ['research'])],
    audit: x => events.push(x)
  });
  const result = await chords.dispatch({
    id: 'cmd-1',
    tasks: [task('a', 'analyze', { kind: 'analyze' }), task('b')]
  });
  assert.equal(result.status, 'COMPLETED');
  assert.deepEqual(result.tasks.map(t => t.workerId), ['claude-mock', 'perplexity-mock']);
  assert.equal(events.length, 4);
  assert.equal(JSON.stringify(events).includes('work on'), false);
});

test('rejects mutating task classes, restricted data and unsupported capabilities', async () => {
  const chords = createChordsOrchestrator({workers: [worker('w', ['research'])]});
  assert.throws(() => chords.plan({id:'bad',tasks:[task('a','research',{kind:'publish'})]}), /not authorized/);
  assert.throws(() => chords.plan({id:'bad',tasks:[task('a','research',{dataClass:'restricted'})]}), /dataClass/);
  await assert.rejects(chords.dispatch({id:'bad2',tasks:[task('a','code-execution')]}), /missing authorized worker/);
});

test('validates graph cycles, unknown dependencies and duplicate IDs before dispatch', () => {
  const chords = createChordsOrchestrator({workers:[worker('w',['research'])]});
  assert.throws(() => chords.plan({id:'x',tasks:[
    task('a','research',{dependsOn:['b']}),task('b','research',{dependsOn:['a']})
  ]}), /cyclic/);
  assert.throws(() => chords.plan({id:'x',tasks:[
    task('a','research',{dependsOn:['missing']})
  ]}), /unknown/);
  assert.throws(() => chords.plan({id:'x',tasks:[task('a'),task('a')]}), /duplicate/);
});

test('falls back to another authorized worker', async () => {
  const chords = createChordsOrchestrator({workers:[
    worker('primary',['research'], async () => {throw Error('down');}),
    worker('backup',['research'])
  ]});
  const result = await chords.dispatch({id:'fallback',tasks:[task('a')]});
  assert.equal(result.tasks[0].workerId,'backup');
});

test('blocks dependents after failure but continues independent work', async () => {
  const chords = createChordsOrchestrator({workers:[
    worker('bad',['research'],async ({id}) => {if(id === 'bad')throw Error('down');return id;})
  ]});
  const result = await chords.dispatch({id:'graph',tasks:[
    task('bad'),task('after','research',{dependsOn:['bad']}),task('ok')
  ]});
  assert.deepEqual(result.tasks.map(t => t.status),['FAILED','BLOCKED','COMPLETED']);
  assert.equal(result.status,'PARTIAL');
});

test('deduplicates the same command in process and rejects altered replay', async () => {
  let count = 0;
  const chords = createChordsOrchestrator({workers:[
    worker('w',['research'],async () => ++count)
  ]});
  const command = {id:'same',tasks:[task('x')]};
  const [first,second] = await Promise.all([chords.dispatch(command), chords.dispatch(command)]);
  assert.deepEqual(first,second);
  assert.equal(count,1);
  await assert.rejects(chords.dispatch({
    id:'same',tasks:[task('x','research',{prompt:'different'})]
  }),/replayed/);
});

test('refuses internal-to-public dependency data flow', () => {
  const chords = createChordsOrchestrator({workers:[worker('w',['research'])]});
  assert.throws(() => chords.plan({id:'leak',tasks:[
    task('internal','research',{dataClass:'internal'}),
    task('outbound','research',{dependsOn:['internal']})
  ]}),/internal-to-public/);
});
