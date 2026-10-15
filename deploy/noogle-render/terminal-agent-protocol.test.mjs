import assert from 'node:assert/strict';
import test from 'node:test';
import {validateAgentAnnouncement,TERMINAL_AGENT_PROTOCOL} from './terminal-agent-protocol.mjs';
test('phone companion advertises no authority before NEO Pass',()=>{
 const a=validateAgentAnnouncement({protocol:TERMINAL_AGENT_PROTOCOL,platform:'android-termux',devicePublicKey:'a'.repeat(64)});
 assert.equal(a.terminalEnabled,false);assert.equal(a.authenticated,false);
});
test('rejects unsupported platform or missing key',()=>{
 assert.throws(()=>validateAgentAnnouncement({protocol:TERMINAL_AGENT_PROTOCOL,platform:'server',devicePublicKey:'a'.repeat(64)}));
});
