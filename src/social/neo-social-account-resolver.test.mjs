import assert from 'node:assert/strict'
import test from 'node:test'
import {resolveAuthorizedAccounts} from './neo-social-account-resolver.mjs'

for (const lane of ['nomni_ausarian','noocracy_report']) {
  test(`${lane} resolves four Facebook pages`,()=>{
    const a=resolveAuthorizedAccounts('facebook',{contentLane:lane})
    assert.equal(a.length,4)
    assert.equal(a[0].accountName,'World Temple')
  })
  test(`${lane} resolves two LinkedIn organizations`,()=>{
    const a=resolveAuthorizedAccounts('linkedin',{contentLane:lane})
    assert.equal(a.length,2)
  })
  test(`${lane} refuses fake YouTube API execution`,()=>{
    assert.throws(()=>resolveAuthorizedAccounts('youtube_community',{contentLane:lane}),/requires_handoff/)
  })
}
