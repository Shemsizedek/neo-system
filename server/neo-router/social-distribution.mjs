export const SOCIAL_CHANNELS = Object.freeze({
  linkedin: Object.freeze({
    id: 'linkedin',
    label: 'LinkedIn',
    transport: 'api',
    auth: 'oauth2',
    publish: 'approval-required',
    capabilities: Object.freeze(['profile.read', 'post.publish']),
  }),
  tiktok: Object.freeze({
    id: 'tiktok',
    label: 'TikTok',
    transport: 'api',
    auth: 'oauth2',
    publish: 'approval-required',
    capabilities: Object.freeze(['account.read', 'content.publish']),
    aiAssistant: Object.freeze({ id: 'tako', status: 'not-public-api' }),
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'Medium',
    transport: 'import-manual',
    auth: 'account-session',
    publish: 'approval-required',
    capabilities: Object.freeze(['draft.prepare', 'canonical.import']),
  }),
})

export function socialDistributionFromEnv(env = process.env) {
  return [
    {
      ...SOCIAL_CHANNELS.linkedin,
      configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET),
    },
    {
      ...SOCIAL_CHANNELS.tiktok,
      configured: Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
    },
    {
      ...SOCIAL_CHANNELS.medium,
      configured: true,
    },
  ]
}

export function getSocialChannel(id) {
  const channel = SOCIAL_CHANNELS[id]
  if (!channel) throw new Error(`Unknown social distribution channel: ${id}`)
  return channel
}

export function authorizeSocialAction({ channelId, action, approved = false } = {}) {
  const channel = getSocialChannel(channelId)
  const allowed = channel.capabilities.includes(action)
  if (!allowed) return { allowed: false, reason: 'unsupported-capability', channel: channel.id, action }
  const write = action.endsWith('.publish') || action === 'draft.prepare' || action === 'canonical.import'
  if (write && !approved) return { allowed: false, reason: 'approval-required', channel: channel.id, action }
  return { allowed: true, reason: 'authorized', channel: channel.id, action }
}
