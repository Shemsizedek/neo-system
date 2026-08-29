import test from 'node:test'
import assert from 'node:assert/strict'
import {DISCORD_MACHINE_READ_PATH,bearerTokenMatches,isDiscordMachineReadRequest} from './discordMachineRead.mjs'

test('machine read path is GET-only and exact',()=>{
  assert.equal(DISCORD_MACHINE_READ_PATH,'/discord/snapshot')
  assert.equal(isDiscordMachineReadRequest({method:'GET',url:'/discord/snapshot',headers:{authorization:'Bearer secret'}},'secret'),true)
  assert.equal(isDiscordMachineReadRequest({method:'POST',url:'/discord/snapshot',headers:{authorization:'Bearer secret'}},'secret'),false)
  assert.equal(isDiscordMachineReadRequest({method:'GET',url:'/snapshot',headers:{authorization:'Bearer secret'}},'secret'),false)
})

test('bearer gate fails closed for missing or wrong tokens',()=>{
  assert.equal(bearerTokenMatches('', 'secret'),false)
  assert.equal(bearerTokenMatches('Bearer wrong','secret'),false)
  assert.equal(bearerTokenMatches('Basic secret','secret'),false)
  assert.equal(bearerTokenMatches('Bearer secret',''),false)
  assert.equal(bearerTokenMatches('Bearer secret','secret'),true)
})
