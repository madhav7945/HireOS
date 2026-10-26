import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock toast so the high-level helpers don't blow up in jsdom.
vi.mock('react-hot-toast', () => {
  const fn = vi.fn()
  fn.success = vi.fn()
  fn.error = vi.fn()
  return { default: fn }
})

// Mock the Supabase client; we control functions.invoke per test.
const invoke = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...args) => invoke(...args) } },
}))

import { sendEmail, emailService } from './email'

beforeEach(() => {
  invoke.mockReset()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://real.supabase.co')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sendEmail', () => {
  it('rejects missing recipient or subject before any network call', async () => {
    const r = await sendEmail({ subject: 'Hi' })
    expect(r.delivered).toBe(false)
    expect(r.error).toMatch(/Missing/)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns an honest stub when Supabase is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co')
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'yo' })
    expect(r.delivered).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('reports delivered:true when the Edge Function succeeds', async () => {
    invoke.mockResolvedValue({ data: { id: 'email_123' }, error: null })
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' })
    expect(invoke).toHaveBeenCalledWith('send-email', expect.objectContaining({ body: expect.any(Object) }))
    expect(r).toEqual({ delivered: true, id: 'email_123' })
  })

  it('degrades to a stub when the Edge Function errors', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'not deployed' } })
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'yo' })
    expect(r.delivered).toBe(false)
    expect(r.error).toBe('not deployed')
  })
})

describe('emailService templates', () => {
  it('sendShortlistEmail forwards a subject and returns the result', async () => {
    invoke.mockResolvedValue({ data: { id: 'x' }, error: null })
    const r = await emailService.sendShortlistEmail('c@d.com', 'Priya', 'Product Designer')
    expect(r.delivered).toBe(true)
    const [, opts] = invoke.mock.calls[0]
    expect(opts.body.to).toBe('c@d.com')
    expect(opts.body.subject).toContain('Product Designer')
  })
})
