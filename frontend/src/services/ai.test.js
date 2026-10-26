import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('react-hot-toast', () => {
  const fn = vi.fn()
  fn.success = vi.fn()
  fn.error = vi.fn()
  return { default: fn }
})

// Email Edge Function succeeds → deliveries report delivered:true.
const invoke = vi.fn(() => Promise.resolve({ data: { id: 'e1' }, error: null }))
vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...a) => invoke(...a) } },
}))

import { aiService } from './ai'
import { localDataService } from './localData'

beforeEach(() => {
  window.localStorage.clear()
  invoke.mockClear()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://real.supabase.co')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function seed() {
  const job = await localDataService.create('jobs', { title: 'Senior React Developer', skills: ['react'] })
  const candidate = await localDataService.create('candidates', { name: 'Arjun', email: 'arjun@x.com' })
  const application = await localDataService.create('applications', { name: 'Arjun', postingTitle: job.title, status: 'New', stage: 'Applied', rating: 0 })
  return { job, candidate, application }
}

describe('processNewApplication', () => {
  it('shortlists a strong candidate and syncs the application record', async () => {
    const { job, candidate, application } = await seed()
    vi.spyOn(aiService, 'evaluateCandidate').mockResolvedValue({
      score: 92, action: 'shortlist', recommendation: 'Great fit', strengths: ['react'], weaknesses: [],
    })

    const result = await aiService.processNewApplication(candidate.id, job.id, application.id)

    expect(result.shortlisted).toBe(true)
    expect(result.confirmationDelivered).toBe(true)
    expect(result.shortlistDelivered).toBe(true)

    const updatedApp = await localDataService.get('applications', application.id)
    expect(updatedApp.stage).toBe('Shortlisted')
    expect(updatedApp.status).toBe('In-Review')
    expect(updatedApp.rating).toBe(5)            // 92 → 5 stars

    const updatedCand = await localDataService.get('candidates', candidate.id)
    expect(updatedCand.aiScore).toBe(92)
    expect(updatedCand.stage).toBe('Shortlisted')
  })

  it('routes a weak candidate to screening and sends no shortlist email', async () => {
    const { job, candidate, application } = await seed()
    vi.spyOn(aiService, 'evaluateCandidate').mockResolvedValue({
      score: 50, action: 'reject', recommendation: 'Not enough overlap', strengths: [], weaknesses: ['x'],
    })

    const result = await aiService.processNewApplication(candidate.id, job.id, application.id)

    expect(result.shortlisted).toBe(false)
    expect(result.shortlistDelivered).toBe(false)

    const updatedApp = await localDataService.get('applications', application.id)
    expect(updatedApp.stage).toBe('Screening')
    expect(updatedApp.status).toBe('New')
    expect(updatedApp.rating).toBe(2)            // 50 → 2 stars

    // Only the confirmation email went out, not the shortlist one.
    const subjects = invoke.mock.calls.map(([, opts]) => opts.body.subject)
    expect(subjects.some(s => /received your application/i.test(s))).toBe(true)
    expect(subjects.some(s => /Congratulations/i.test(s))).toBe(false)
  })

  it('returns undefined when candidate or job is missing', async () => {
    const result = await aiService.processNewApplication('nope', 'nope', 'nope')
    expect(result).toBeUndefined()
  })
})
