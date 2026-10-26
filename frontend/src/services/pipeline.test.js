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
import { runApplicationPipeline, onInterviewComplete, getAutopilotConfig, setAutopilotConfig } from './pipeline'

beforeEach(() => {
  window.localStorage.clear()
  invoke.mockClear()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://real.supabase.co')
  setAutopilotConfig({ autoSchedule: true, autoReminders: true, autoReject: true, autoSendOffer: false })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function seed() {
  const job = await localDataService.create('jobs', { title: 'Senior React Developer', skills: ['react'], salary: { min: 2000000, max: 3500000, currency: 'INR', period: 'yearly' }, hiringManager: 'Vikram' })
  const candidate = await localDataService.create('candidates', { name: 'Arjun', email: 'arjun@x.com' })
  const application = await localDataService.create('applications', { name: 'Arjun', postingTitle: job.title, status: 'New', stage: 'Applied', rating: 0 })
  return { job, candidate, application }
}

const subjects = () => invoke.mock.calls.map(([, opts]) => opts.body.subject)

describe('runApplicationPipeline', () => {
  it('shortlists → creates an interview with a join link and schedules it', async () => {
    const { job, candidate, application } = await seed()
    vi.spyOn(aiService, 'evaluateCandidate').mockResolvedValue({
      score: 92, action: 'shortlist', recommendation: 'Great fit', strengths: ['react'], weaknesses: [],
    })

    await runApplicationPipeline({ candidateId: candidate.id, jobId: job.id, applicationId: application.id })

    const interviews = await localDataService.list('interviews')
    const created = interviews.find((i) => i.candidateId === candidate.id)
    expect(created).toBeTruthy()
    expect(created.interview_link).toMatch(/\/interview\//)
    expect(created.status).toBe('scheduled')

    const cand = await localDataService.get('candidates', candidate.id)
    expect(cand.stage).toBe('Interview Scheduled')
    expect(cand.pipelineTimeline.some((t) => t.stage === 'interview_scheduled')).toBe(true)

    // confirmation + shortlist + interview-scheduled + join-link emails all went out.
    expect(subjects().some((s) => /received your application/i.test(s))).toBe(true)
    expect(subjects().some((s) => /Interview Scheduled/i.test(s))).toBe(true)
    expect(subjects().some((s) => /Join your Interview/i.test(s))).toBe(true)
  })

  it('not shortlisted → sends a respectful decline and marks rejected', async () => {
    const { job, candidate, application } = await seed()
    vi.spyOn(aiService, 'evaluateCandidate').mockResolvedValue({
      score: 40, action: 'reject', recommendation: 'Low overlap', strengths: [], weaknesses: ['x'],
    })

    await runApplicationPipeline({ candidateId: candidate.id, jobId: job.id, applicationId: application.id })

    const cand = await localDataService.get('candidates', candidate.id)
    expect(cand.stage).toBe('Rejected')
    expect(subjects().some((s) => /Update on your application/i.test(s))).toBe(true)
  })
})

describe('onInterviewComplete', () => {
  async function seedScheduled(decisionScore = 88) {
    const { job, candidate, application } = await seed()
    vi.spyOn(aiService, 'evaluateCandidate').mockResolvedValue({ score: 92, action: 'shortlist', recommendation: 'Great', strengths: [], weaknesses: [] })
    await runApplicationPipeline({ candidateId: candidate.id, jobId: job.id, applicationId: application.id })
    const interviews = await localDataService.list('interviews')
    const iv = interviews.find((i) => i.candidateId === candidate.id)
    return { job, candidate, application, iv }
  }

  it('strong_hire → drafts an offer + HR approval task (auto-send off)', async () => {
    const { candidate, iv } = await seedScheduled()
    invoke.mockClear()

    const res = await onInterviewComplete({
      sessionId: iv.session_id, reason: 'completed',
      scores: { overall: 88, recommendation: 'strong_hire', summary: 'Strong' },
    })

    expect(res.offered).toBe(true)
    const offers = await localDataService.list('offers')
    expect(offers.find((o) => o.candidateId === candidate.id)?.status).toBe('draft')
    const tasks = await localDataService.list('tasks')
    expect(tasks.some((t) => /Approve & send offer/i.test(t.title))).toBe(true)
    // auto-send off → NO offer email yet.
    expect(subjects().some((s) => /Your offer for/i.test(s))).toBe(false)
  })

  it('auto-send on → emails the offer', async () => {
    setAutopilotConfig({ autoSendOffer: true })
    const { iv } = await seedScheduled()
    invoke.mockClear()

    await onInterviewComplete({ sessionId: iv.session_id, reason: 'completed', scores: { overall: 90, recommendation: 'strong_hire' } })
    expect(subjects().some((s) => /Your offer for|Offer Letter/i.test(s))).toBe(true)
  })

  it('no_hire → sends a rejection and does not create an offer', async () => {
    const { candidate, iv } = await seedScheduled()
    invoke.mockClear()

    const res = await onInterviewComplete({ sessionId: iv.session_id, reason: 'completed', scores: { overall: 30, recommendation: 'no_hire' } })
    expect(res.offered).toBe(false)
    const offers = await localDataService.list('offers')
    expect(offers.find((o) => o.candidateId === candidate.id)).toBeUndefined()
    expect(subjects().some((s) => /Update on your application/i.test(s))).toBe(true)
  })
})

describe('autopilot config', () => {
  it('round-trips through localStorage', () => {
    setAutopilotConfig({ autoSendOffer: true })
    expect(getAutopilotConfig().autoSendOffer).toBe(true)
  })
})
