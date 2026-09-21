import assert from 'node:assert/strict'
import test from 'node:test'
import { buildKnowledgeContext } from './knowledge-context.mjs'
import { authorizedLibraryCatalog } from '../holytemples-adapter/adapter.mjs'

test('builds bounded NEO knowledge context with provenance and Algo grounding', () => {
  const resource = authorizedLibraryCatalog({ accessClass: 'PUBLIC_WORLD_LIBRARY' })[0]
  assert.ok(resource?.id)
  const result = buildKnowledgeContext({
    objective: resource.title || 'NEO knowledge',
    attachments: [resource.id],
    missionId: 'KNOW-1',
  })
  assert.ok(result.context.includes('NEO KNOWLEDGE CONTEXT'))
  assert.ok(result.context.includes('NEO Algo:'))
  assert.ok(result.attachedIds.includes(resource.id))
  assert.ok(result.provenance.some(item => item.id === resource.id))
  assert.equal(result.algo.missionId, 'KNOW-1')
})

test('deduplicates thread attachments and preserves explicit provenance metadata', () => {
  const resource = authorizedLibraryCatalog({ accessClass: 'PUBLIC_WORLD_LIBRARY' })[0]
  const result = buildKnowledgeContext({
    objective: 'unlikely-nonmatching-query-zzzz',
    attachments: [resource.id, resource.id],
    missionId: 'KNOW-2',
  })
  assert.equal(result.attachedIds.filter(id => id === resource.id).length, 1)
  const citation = result.provenance.find(item => item.id === resource.id)
  assert.equal(citation.title, resource.title)
  assert.equal(citation.accessClass, resource.accessClass)
})


test('does not attach protected library records through the public Knowledge Browser path', () => {
  const protectedRecord = authorizedLibraryCatalog().find(resource => resource.accessClass !== 'PUBLIC_WORLD_LIBRARY')
  if (!protectedRecord) return
  const result = buildKnowledgeContext({
    objective: 'protected record boundary test',
    attachments: [protectedRecord.id],
    missionId: 'KNOW-3',
  })
  assert.equal(result.attachedIds.includes(protectedRecord.id), false)
  assert.equal(result.provenance.some(item => item.id === protectedRecord.id), false)
})
