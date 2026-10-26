import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  chatWithFallback,
  parseRetryMs,
  isFunctionCallFailure,
  extractTextToolCalls,
  RateLimitError,
  FunctionCallError,
  MODEL_CHAIN,
} from './assistant'

// Build a minimal fetch Response-like object.
function res({ status = 200, retryAfter, body = '', json }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (k.toLowerCase() === 'retry-after' ? retryAfter ?? null : null) },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => json ?? {},
  }
}

const okCompletion = (content) => res({ status: 200, json: { choices: [{ message: { content, tool_calls: [] } }] } })
const modelOf = (call) => JSON.parse(call[1].body).model

afterEach(() => vi.unstubAllGlobals())

describe('parseRetryMs', () => {
  it('reads the Retry-After header (seconds → ms, capped)', () => {
    expect(parseRetryMs(res({ retryAfter: '2' }), '')).toBe(2000)
  })
  it('falls back to parsing "try again in Xs" from the body', () => {
    expect(parseRetryMs(res({}), 'Rate limit reached. Please try again in 1.5s.')).toBe(1500)
  })
  it('defaults to 2s when there is no hint', () => {
    expect(parseRetryMs(res({}), 'no hint here')).toBe(2000)
  })
})

describe('isFunctionCallFailure', () => {
  it('matches the Groq malformed tool-call 400', () => {
    expect(isFunctionCallFailure(400, 'Failed to call a function. See failed_generation.')).toBe(true)
  })
  it('ignores other 400s and non-400 statuses', () => {
    expect(isFunctionCallFailure(400, 'some other validation error')).toBe(false)
    expect(isFunctionCallFailure(429, 'failed_generation')).toBe(false)
  })
})

describe('extractTextToolCalls (safety net for models that fake tool calls)', () => {
  it('parses <tool>{json}</tool> tags that match a known tool', () => {
    const c = 'Sure! <navigate>{"path": "pipeline"}</navigate>'
    expect(extractTextToolCalls(c)).toEqual([{ name: 'navigate', args: { path: 'pipeline' } }])
  })

  it('parses multiple faked calls', () => {
    const c = '<createJob>{"title":"QA"}</createJob> and <navigate>{"path":"jobs"}</navigate>'
    const calls = extractTextToolCalls(c)
    expect(calls.map((x) => x.name)).toEqual(['createJob', 'navigate'])
    expect(calls[0].args.title).toBe('QA')
  })

  it('parses the {"name":...,"arguments":...} JSON form', () => {
    const c = 'Running {"name":"createTask","arguments":{"title":"Call Mia"}}'
    expect(extractTextToolCalls(c)).toEqual([{ name: 'createTask', args: { title: 'Call Mia' } }])
  })

  it('ignores tags that are not real tools', () => {
    expect(extractTextToolCalls('<thinking>{"x":1}</thinking>')).toEqual([])
  })

  it('returns [] for plain prose', () => {
    expect(extractTextToolCalls('Done — created the job.')).toEqual([])
  })
})

describe('chatWithFallback', () => {
  it('falls back to a lighter model when the primary is rate-limited', async () => {
    const fetchMock = vi.fn(async (_url, opts) => {
      const model = JSON.parse(opts.body).model
      if (model === MODEL_CHAIN[0]) return res({ status: 429, retryAfter: '0.01', body: '{"error":"rate"}' })
      return okCompletion('done')
    })
    vi.stubGlobal('fetch', fetchMock)

    const data = await chatWithFallback([{ role: 'user', content: 'hi' }], {})
    expect(data.choices[0].message.content).toBe('done')
    const models = fetchMock.mock.calls.map(modelOf)
    expect(models[0]).toBe(MODEL_CHAIN[0])     // tried primary first
    expect(models).toContain(MODEL_CHAIN[1])   // then fell back
  })

  it('recovers from a malformed tool-call 400 by re-rolling then falling back', async () => {
    const fetchMock = vi.fn(async (_url, opts) => {
      const model = JSON.parse(opts.body).model
      if (model === MODEL_CHAIN[0]) return res({ status: 400, body: '{"error":{"message":"Failed to call a function"}}' })
      return okCompletion('ok')
    })
    vi.stubGlobal('fetch', fetchMock)

    const data = await chatWithFallback([{ role: 'user', content: 'add a reminder' }], { tools: [] })
    expect(data.choices[0].message.content).toBe('ok')
    const primaryCalls = fetchMock.mock.calls.map(modelOf).filter((m) => m === MODEL_CHAIN[0])
    expect(primaryCalls.length).toBe(2) // initial + one re-roll before giving up on primary
  })

  it('throws RateLimitError only when every model is capped', async () => {
    const fetchMock = vi.fn(async () => res({ status: 429, retryAfter: '0.01', body: 'rate' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(chatWithFallback([{ role: 'user', content: 'hi' }], {})).rejects.toBeInstanceOf(RateLimitError)
  })

  it('propagates a non-retryable error immediately (no fallback)', async () => {
    const fetchMock = vi.fn(async () => res({ status: 401, body: 'bad key' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(chatWithFallback([{ role: 'user', content: 'hi' }], {})).rejects.toThrow(/401/)
    expect(fetchMock).toHaveBeenCalledTimes(1) // did not try other models
  })
})
