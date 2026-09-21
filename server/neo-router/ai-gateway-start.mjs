import { createNeopassSubjectResolver } from '../neo-platform-api/integration-hub.mjs'
import { createNeoAiGatewayServer } from './ai-gateway-server.mjs'
import { createConversationStore } from './conversation-store.mjs'
import { createProviderTelemetryStore } from './provider-telemetry-store.mjs'
import { createNeoRouter } from './router.mjs'
import { providersFromEnv } from './providers.mjs'

const resolveSubject = createNeopassSubjectResolver()

async function resolveTrustedIdentity(req) {
  const subjectId = resolveSubject(req)
  if (!subjectId) return null
  return { authenticated: true, trustBoundary: 'neo-gateway', subjectId }
}

const conversationStore = createConversationStore({
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
})

const providerTelemetryStore = createProviderTelemetryStore({
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
})
const router = createNeoRouter({
  providers: providersFromEnv(process.env),
  telemetryRecorder: event => providerTelemetryStore.record(event),
})

const port = Number(process.env.PORT || process.env.NEO_AI_GATEWAY_PORT || 8080)
const host = process.env.HOST || '0.0.0.0'

createNeoAiGatewayServer({ resolveTrustedIdentity, conversationStore, providerTelemetryStore, router }).listen(port, host, () => {
  console.log(`neo-ai-gateway listening on ${host}:${port}`)
})
