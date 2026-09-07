import assert from 'node:assert/strict'
import test from 'node:test'
import { SOCIAL_CHANNELS, authorizeSocialAction, socialDistributionFromEnv } from './social-distribution.mjs'

test('registers LinkedIn TikTok and Medium with distinct transports', () => {
  assert.equal(SOCIAL_CHANNELS.linkedin.transport, 'api')
  assert.equal(SOCIAL_CHANNELS.tiktok.transport, 'api')
  assert.equal(SOCIAL_CHANNELS.medium.transport, 'import-manual')
  assert.equal(SOCIAL_CHANNELS.tiktok.aiAssistant.status, 'not-public-api')
})

test('environment readiness requires native OAuth credentials for LinkedIn and TikTok', () => {
  const channels = socialDistributionFromEnv({
    LINKEDIN_CLIENT_ID: 'li-id',
    LINKEDIN_CLIENT_SECRET: 'li-secret',
    TIKTOK_CLIENT_KEY: 'tt-key',
    TIKTOK_CLIENT_SECRET: 'tt-secret',
  })
  assert.deepEqual(channels.map((channel) => [channel.id, channel.configured]), [
    ['linkedin', true],
    ['tiktok', true],
    ['medium', true],
  ])
})

test('social writes fail closed until explicitly approved', () => {
  assert.deepEqual(authorizeSocialAction({ channelId: 'linkedin', action: 'post.publish' }), {
    allowed: false,
    reason: 'approval-required',
    channel: 'linkedin',
    action: 'post.publish',
  })
  assert.equal(authorizeSocialAction({ channelId: 'linkedin', action: 'post.publish', approved: true }).allowed, true)
  assert.equal(authorizeSocialAction({ channelId: 'tiktok', action: 'content.publish', approved: true }).allowed, true)
})

test('unsupported capabilities are denied even with approval', () => {
  const result = authorizeSocialAction({ channelId: 'medium', action: 'account.delete', approved: true })
  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'unsupported-capability')
})
