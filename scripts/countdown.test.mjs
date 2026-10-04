import assert from 'node:assert/strict'
import test from 'node:test'
import { getCountdown, OVERWATCH_LAUNCH_MS } from '../src/lib/countdown.ts'
import { resolveOfficialAccount } from '../src/data/officialAccounts.ts'

test('lançamento corresponde à meia-noite de Brasília', () => {
  assert.equal(new Date(OVERWATCH_LAUNCH_MS).toISOString(), '2026-10-11T03:00:00.000Z')
  assert.deepEqual(getCountdown(Date.parse('2026-10-10T00:00:00-03:00')), {
    days: 1, hours: 0, minutes: 0, seconds: 0, complete: false,
  })
})

test('último segundo continua ativo; no prazo e depois dele não há valores negativos', () => {
  assert.equal(getCountdown(OVERWATCH_LAUNCH_MS - 1).seconds, 1)
  for (const now of [OVERWATCH_LAUNCH_MS, OVERWATCH_LAUNCH_MS + 86400000]) {
    assert.deepEqual(getCountdown(now), { days: 0, hours: 0, minutes: 0, seconds: 0, complete: true })
  }
})

test('intervalos longos não acumulam atraso e viradas de minuto são corretas', () => {
  assert.deepEqual(getCountdown(OVERWATCH_LAUNCH_MS - 90061000), {
    days: 1, hours: 1, minutes: 1, seconds: 1, complete: false,
  })
  assert.equal(getCountdown(OVERWATCH_LAUNCH_MS - 60000).minutes, 1)
  assert.equal(getCountdown(OVERWATCH_LAUNCH_MS - 59000).seconds, 59)
})

test('posts antigos permanecem em imperafc e Overwatch mantém sua própria conta', () => {
  assert.equal(resolveOfficialAccount(undefined), 'imperafc')
  assert.equal(resolveOfficialAccount(null), 'imperafc')
  assert.equal(resolveOfficialAccount('imperafc'), 'imperafc')
  assert.equal(resolveOfficialAccount('imperaow'), 'imperaow')
})
