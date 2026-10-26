import { describe, it, expect } from 'vitest'
import { summarizeRun, formatRunOutput, fmtValue } from './codeRunner'

describe('fmtValue', () => {
  it('quotes strings and serializes arrays', () => {
    expect(fmtValue('hi')).toBe('"hi"')
    expect(fmtValue([0, 1])).toBe('[0,1]')
  })
})

describe('summarizeRun', () => {
  it('reports all passed', () => {
    const r = { ok: true, results: [{ pass: true }, { pass: true }] }
    expect(summarizeRun(r)).toMatch(/All 2 test cases passed/)
  })
  it('reports partial with first failing case detail', () => {
    const r = { ok: false, results: [
      { pass: true, args: [1], actual: 1 },
      { pass: false, args: [[3, 2, 4], 6], actual: [0, 1] },
    ] }
    const s = summarizeRun(r)
    expect(s).toMatch(/1 of 2 test cases passed/)
    expect(s).toMatch(/returned \[0,1\]/)
  })
  it('surfaces errors and timeouts', () => {
    expect(summarizeRun({ error: 'boom' })).toMatch(/threw an error: boom/)
    expect(summarizeRun({ timedOut: true })).toMatch(/infinite loop/)
  })
})

describe('formatRunOutput', () => {
  it('renders console logs and a pass/fail tally', () => {
    const out = formatRunOutput({
      ok: false,
      logs: ['debug 1'],
      results: [
        { args: [[2, 7], 9], expected: [0, 1], actual: [0, 1], pass: true },
        { args: ['x'], expected: true, actual: false, pass: false },
      ],
    })
    expect(out).toContain('debug 1')
    expect(out).toContain('1/2 tests passed')
    expect(out).toMatch(/✔ Test 1/)
    expect(out).toMatch(/✖ Test 2/)
  })
})
