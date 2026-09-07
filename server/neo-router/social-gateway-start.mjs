import { createNeopassSubjectResolver } from '../neo-platform-api/integration-hub.mjs'
import { createSocialGatewayServer } from './social-gateway-server.mjs'

const resolveSubject = createNeopassSubjectResolver()

async function resolveTrustedIdentity(req) {
  const subjectId = resolveSubject(req)
  if (!subjectId) return null
  return {
    authenticated: true,
    trustBoundary: 'neo-gateway',
    subjectId,
  }
}

const port = Number(process.env.PORT || 8080)
const host = process.env.HOST || '0.0.0.0'

createSocialGatewayServer({ resolveTrustedIdentity }).listen(port, host, () => {
  console.log(`neo-social-gateway listening on ${host}:${port}`)
})
