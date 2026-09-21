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
