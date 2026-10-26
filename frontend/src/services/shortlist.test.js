import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('react-hot-toast', () => {
  const fn = vi.fn()
  fn.success = vi.fn()
  fn.error = vi.fn()
  return { default: fn }
})

const invoke = vi.fn(() => Promise.resolve({ data: { id: 'e1' }, error: null }))
vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...a) => invoke(...a) } },
}))

import { rankAndShortlist, listCandidatesForJob, SHORTLIST_DECISION } from './shortlist'
import { applyKnockouts, aiService } from './ai'
import { localDataService } from './localData'

beforeEach(() => {
  window.localStorage.clear()
  // Pre-seed empty collections so the demo defaults don't pollute ranking.
  for (const c of ['jobs', 'candidates', 'applications', 'interviews']) {
    window.localStorage.setItem(`hireos.local.${c}`, '[]')
  }
  invoke.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

// Score candidates deterministically by name so ordering is predictable.
function mockScoresByName(map) {
  vi.spyOn(aiService, 'evaluateCandidate').mockImplementation(async (cand) => {
    const score = map[cand.name] ?? 50
    return {
      score,
      breakdown: { technical: score, experience: score, screening: score, education: score, communication: score },
      recommendation: `${cand.name} scored ${score}`,
      matchedSkills: [], missingSkills: [], strengths: [], weaknesses: [],
      action: 'shortlist',
    }
  })
}

async function seedJob(extra = {}) {
  return localDataService.create('jobs', { title: 'Senior React Developer', skills: ['react'], shortlistSize: 2, ...extra })
}
async function seedCandidate(job, data) {
  return localDataService.create('candidates', { jobId: job.id, appliedFor: job.title, ...data })
}

describe('applyKnockouts', () => {
  it('passes when no hard requirements are set', () => {
    const r = applyKnockouts({ name: 'A' }, { title: 'X' })
    expect(r.passed).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it('fails on minimum experience', () => {
    const r = applyKnockouts({ name: 'A', experience: 2 }, { experienceMin: 5 })
    expect(r.passed).toBe(false)
    expect(r.reasons[0]).toMatch(/minimum experience/i)
  })

  it('fails on work authorization when required', () => {
    const r = applyKnockouts({ name: 'A', workAuth: 'Needs sponsorship' }, { requireWorkAuth: true })
    expect(r.passed).toBe(false)
    expect(r.reasons[0]).toMatch(/work without sponsorship/i)
  })

  it('fails on a disqualifying screening answer', () => {
    const job = { screeningQuestions: [{ id: 'q1', text: 'Can relocate?', autoDisqualify: 'No' }] }
    const cand = { name: 'A', screeningAnswers: { q1: 'No' } }
    const r = applyKnockouts(cand, job)
    expect(r.passed).toBe(false)
    expect(r.reasons[0]).toMatch(/disqualifying answer/i)
  })

  it('supports a numeric min: knockout', () => {
    const job = { screeningQuestions: [{ id: 'q1', text: 'Years of React', type: 'Number', autoDisqualify: 'min:3' }] }
    expect(applyKnockouts({ screeningAnswers: { q1: 1 } }, job).passed).toBe(false)
    expect(applyKnockouts({ screeningAnswers: { q1: 4 } }, job).passed).toBe(true)
  })
})

describe('listCandidatesForJob', () => {
  it('matches by jobId, and by title for legacy records without jobId', async () => {
    const job = await seedJob()
    await seedCandidate(job, { name: 'ByJobId' })
    // Legacy record: no jobId, only appliedFor title.
    await localDataService.create('candidates', { name: 'ByTitle', appliedFor: job.title })
    await localDataService.create('candidates', { name: 'Other', appliedFor: 'Different Role' })

    const list = await listCandidatesForJob(job.id, job)
    const names = list.map(c => c.name).sort()
    expect(names).toEqual(['ByJobId', 'ByTitle'])
  })
})

describe('rankAndShortlist', () => {
  it('knocks out, ranks survivors, and marks the top N recommended', async () => {
    const job = await seedJob({ shortlistSize: 2, experienceMin: 2 })
    mockScoresByName({ Top: 95, Mid: 80, Low: 65 })

    await seedCandidate(job, { name: 'Top', experience: 5 })
    await seedCandidate(job, { name: 'Mid', experience: 4 })
    await seedCandidate(job, { name: 'Low', experience: 3 })
    await seedCandidate(job, { name: 'Junior', experience: 0 }) // knocked out: below min exp

    const res = await rankAndShortlist({ jobId: job.id })

    expect(res.counts.knockouts).toBe(1)
    expect(res.knockouts[0].name).toBe('Junior')

    // Ranked by score desc.
    expect(res.ranked.map(c => c.name)).toEqual(['Top', 'Mid', 'Low'])
    expect(res.ranked.map(c => c.rank)).toEqual([1, 2, 3])

    // Top 2 recommended, the rest below the line.
    expect(res.recommended.map(c => c.name)).toEqual(['Top', 'Mid'])
    expect(res.belowLine.map(c => c.name)).toEqual(['Low'])
    expect(res.recommended[0].shortlistDecision).toBe(SHORTLIST_DECISION.RECOMMENDED)
    expect(res.belowLine[0].shortlistDecision).toBe(SHORTLIST_DECISION.BELOW_LINE)
  })

  it('applies a score floor as a secondary drop', async () => {
    const job = await seedJob({ shortlistSize: 5, shortlistScoreFloor: 70 })
    mockScoresByName({ Strong: 90, Weak: 60 })
    await seedCandidate(job, { name: 'Strong' })
    await seedCandidate(job, { name: 'Weak' })

    const res = await rankAndShortlist({ jobId: job.id })
    // Both are within top-5, but Weak (60) is below the floor of 70.
    expect(res.recommended.map(c => c.name)).toEqual(['Strong'])
    expect(res.belowLine.map(c => c.name)).toEqual(['Weak'])
  })

  it('reuses stored scores on a re-rank without re-scoring', async () => {
    const job = await seedJob({ shortlistSize: 1 })
    mockScoresByName({ A: 88, B: 70 })
    await seedCandidate(job, { name: 'A' })
    await seedCandidate(job, { name: 'B' })

    await rankAndShortlist({ jobId: job.id })
    const callsAfterFirst = aiService.evaluateCandidate.mock.calls.length
    expect(callsAfterFirst).toBe(2)

    // Second run should reuse stored aiScore/aiBreakdown — no new evaluate calls.
    const res2 = await rankAndShortlist({ jobId: job.id })
    expect(aiService.evaluateCandidate.mock.calls.length).toBe(callsAfterFirst)
    expect(res2.ranked.map(c => c.name)).toEqual(['A', 'B'])
  })

  it('does not schedule interviews (no human confirm yet)', async () => {
    const job = await seedJob({ shortlistSize: 2 })
    mockScoresByName({ A: 90 })
    await seedCandidate(job, { name: 'A' })

    await rankAndShortlist({ jobId: job.id })
    const interviews = await localDataService.list('interviews')
    expect(interviews.length).toBe(0)
  })
})
