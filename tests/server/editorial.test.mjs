import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeEditorial, featureChange, featureInput, publishedFeatures, requiredRevision } from '../../server/editorial.mjs'

const time = '2026-11-24T10:00:00.000Z'
const future = '2026-11-25T10:00:00.000Z'
const sample = { id: 'legacy', question: 2, title: 'Bài cũ', note: '', status: 'published', updatedAt: time }
const makeChange = (input, id, revision) => ({ id, input, revision, at: time, eventId: id + ':' + revision })

test('migrates the previous editorial array and only displays due items in priority order', () => {
  const legacy = decodeEditorial(JSON.stringify([sample]))
  assert.equal(legacy.features[0].priority, 0)
  assert.equal(legacy.features[0].revision, 1)
  const upcoming = featureInput({ question: 3, title: 'Lịch ngày mai', status: 'published', publishAt: future, priority: 20 })
  const next = featureChange(legacy, makeChange(upcoming, 'new', null))
  assert.deepEqual(publishedFeatures(next.features, Date.parse(time)).map(item => item.question), [2])
  const visible = publishedFeatures(next.features, Date.parse(future))
  assert.deepEqual(visible.map(item => item.question), [3, 2])
  assert.equal(visible[0].publishAt, undefined)
  assert.equal(visible[0].revision, undefined)
})

test('preserves a newer revision and audits only successful modifications', () => {
  const legacy = decodeEditorial(JSON.stringify([sample]))
  const edited = featureInput({ ...sample, priority: 18 })
  const latest = featureChange(legacy, makeChange(edited, 'legacy', 1))
  assert.equal(latest.features[0].revision, 2)
  assert.throws(() => featureChange(latest, makeChange(edited, 'legacy', 1)), error => error.status === 412)
  assert.throws(() => featureChange(latest, makeChange(null, 'legacy', 1)), error => error.status === 412)
  const removed = featureChange(latest, makeChange(null, 'legacy', 2))
  assert.deepEqual(removed.features, [])
  assert.deepEqual(removed.activity.map(entry => entry.action), ['removed', 'updated'])
  assert.throws(() => requiredRevision(undefined), error => error.status === 428)
  assert.throws(() => featureInput({ ...sample, publishAt: '2026-02-30T10:00:00.000Z' }), error => error.status === 400)
})
