import { createNeopassSubjectResolver } from '../neo-platform-api/integration-hub.mjs'
import { createSocialGatewayServer } from './social-gateway-server.mjs'
import { createGcsSocialAutomationStore } from './social-automation-store.mjs'
import { publishOmnitrixSocialJob } from '../../src/social/omnitrix-social-publisher.mjs'
import { createGcsShemsiStore } from './shemsi-store.mjs'
import { createShemsiReplyPublisher } from '../../src/social/shemsi-reply-publisher.mjs'

const resolveSubject = createNeopassSubjectResolver()

async function resolveTrustedIdentity(req) {
  const subjectId = resolveSubject(req)
  if (!subjectId) return null
  return { authenticated: true, trustBoundary: 'neo-gateway', subjectId }
}

const automationStore = createGcsSocialAutomationStore()
const shemsiStore = createGcsShemsiStore()
const publishShemsiReply = createShemsiReplyPublisher()

async function publishOmnitrixJob(job) {
  if (job.destination === 'facebook' && process.env.FACEBOOK_PROVIDER === 'existing-organic' && !process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    return { destination:'facebook', contentId:job.contentId, status:'existing-organic-provider-external', published:false }
  }
  if (job.destination === 'linkedin' && (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_OWNER_URN)) {
    return { destination:'linkedin', contentId:job.contentId, status:'oauth-user-token-required', published:false }
  }
  if (job.destination === 'tiktok' && !process.env.TIKTOK_ACCESS_TOKEN) {
    return { destination:'tiktok', contentId:job.contentId, status:'oauth-user-token-required', published:false }
  }
  if (job.destination === 'youtube_community') {
    return { destination:'youtube_community', contentId:job.contentId, status:'browser-ui-assisted', published:false }
  }
  const credentials =
    job.destination === 'facebook' ? { pageId:process.env.FACEBOOK_PAGE_ID, pageAccessToken:process.env.FACEBOOK_PAGE_ACCESS_TOKEN, sourceVersion:'omnitrix-auto' } :
    job.destination === 'linkedin' ? { ownerUrn:process.env.LINKEDIN_OWNER_URN, accessToken:process.env.LINKEDIN_ACCESS_TOKEN, sourceVersion:'omnitrix-auto' } :
    job.destination === 'tiktok' ? { accessToken:process.env.TIKTOK_ACCESS_TOKEN, accountId:process.env.TIKTOK_ACCOUNT_ID } :
    {}
  return publishOmnitrixSocialJob(job,credentials)
}

const port = Number(process.env.PORT || 8080)
const host = process.env.HOST || '0.0.0.0'

createSocialGatewayServer({ resolveTrustedIdentity, automationStore, publishOmnitrixJob, shemsiStore, publishShemsiReply }).listen(port, host, () => {
  console.log(`neo-social-gateway listening on ${host}:${port}`)
})
