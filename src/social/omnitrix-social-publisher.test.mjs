import test from 'node:test'
import assert from 'node:assert/strict'
import { OMNITRIX_022_ROUTING, publishOmnitrixSocialJob } from './omnitrix-social-publisher.mjs'

test('automatic daily distribution is enabled', () => {
  assert.equal(OMNITRIX_022_ROUTING.automaticDailyDistribution, true)
  assert.deepEqual(OMNITRIX_022_ROUTING.isolated, ['x', 'instagram'])
})

test('isolates X without attempting publication', async () => {
  const result = await publishOmnitrixSocialJob({ destination:'x', contentId:'test:1' })
  assert.equal(result.published, false)
  assert.equal(result.status, 'isolated')
})

test('TikTok fails closed without a user access token', async () => {
  await assert.rejects(
    () => publishOmnitrixSocialJob({ destination:'tiktok', contentId:'test:2', headline:'Test', caption:'Test', imageUrl:'https://example.com/test.jpg' }, { accessToken:'' }),
    /tiktok_access_token_required/
  )
})
