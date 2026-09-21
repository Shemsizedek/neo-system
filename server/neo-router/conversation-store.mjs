import { randomUUID } from 'node:crypto'
import { createFirestoreRestDb } from '../neo-counter-backend/firestore-rest-db.mjs'

const COLLECTION = 'neo_ai_threads'
const MAX_MESSAGES = 100

function nowIso(now = () => new Date()) {
  return now().toISOString()
}

function sanitizeTitle(value) {
  const title = String(value ?? '').trim().replace(/\s+/g, ' ')
  return title ? title.slice(0, 120) : 'Untitled NEOsync Thread'
}

function sanitizeText(value, max = 24000) {
  return String(value ?? '').trim().slice(0, max)
}

export function createConversationStore({ projectId, databaseId = '(default)', db, now = () => new Date() } = {}) {
  const firestore = db ?? createFirestoreRestDb({ projectId, databaseId })

  async function createThread({ subjectId, title, capability = 'personalization' }) {
    if (!subjectId) throw new Error('subject_required')
    const id = randomUUID()
    const timestamp = nowIso(now)
    const thread = {
      id,
      subjectId,
      title: sanitizeTitle(title),
      capability: sanitizeText(capability, 64) || 'personalization',
      provider: null,
      lastResponseId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    }
    await firestore.collection(COLLECTION).doc(id).set(thread)
    return thread
  }

  async function getThread({ subjectId, threadId }) {
    if (!subjectId || !threadId) throw new Error('thread_identity_required')
    const snap = await firestore.collection(COLLECTION).doc(threadId).get()
    if (!snap.exists) return null
    const thread = snap.data()
    if (thread.subjectId !== subjectId) throw new Error('thread_forbidden')
    return thread
  }

  async function listThreads({ subjectId, limit = 30 }) {
    if (!subjectId) throw new Error('subject_required')
    const snapshot = await firestore.collection(COLLECTION)
      .where('subjectId', '==', subjectId)
      .orderBy('updatedAt', 'desc')
      .limit(Math.min(Math.max(Number(limit) || 30, 1), 100))
      .get()
    return snapshot.docs.map(doc => doc.data())
  }

  async function renameThread({ subjectId, threadId, title }) {
    const thread = await getThread({ subjectId, threadId })
    if (!thread) return null
    const updated = { ...thread, title: sanitizeTitle(title), updatedAt: nowIso(now) }
    await firestore.collection(COLLECTION).doc(threadId).set(updated)
    return updated
  }

  async function appendTurn({ subjectId, threadId, objective, result, capability }) {
    const thread = await getThread({ subjectId, threadId })
    if (!thread) throw new Error('thread_not_found')
    const timestamp = nowIso(now)
    const messages = Array.isArray(thread.messages) ? [...thread.messages] : []
    const userText = sanitizeText(objective)
    const assistantText = sanitizeText(result?.text)
    if (userText) messages.push({ role: 'user', text: userText, createdAt: timestamp })
    if (assistantText || result?.responseId) {
      messages.push({
        role: 'assistant',
        text: assistantText,
        provider: result?.provider ?? 'meta-muse',
        responseId: result?.responseId ?? null,
        createdAt: timestamp,
      })
    }
    const trimmed = messages.slice(-MAX_MESSAGES)
    const updated = {
      ...thread,
      capability: sanitizeText(capability, 64) || thread.capability,
      provider: result?.provider ?? thread.provider ?? null,
      lastResponseId: result?.responseId ?? thread.lastResponseId ?? null,
      updatedAt: timestamp,
      messages: trimmed,
    }
    await firestore.collection(COLLECTION).doc(threadId).set(updated)
    return updated
  }

  return { createThread, getThread, listThreads, renameThread, appendTurn }
}
