import { describe, it, expect } from 'vitest'
import { parseInterviewerReply } from './interviewAI'

describe('parseInterviewerReply', () => {
  it('returns plain text unchanged with no control', () => {
    const r = parseInterviewerReply('Nice approach — what is the time complexity?')
    expect(r.text).toBe('Nice approach — what is the time complexity?')
    expect(r.control).toEqual({ warn: false, end: null, phase: null })
  })

  it('extracts a PHASE token', () => {
    const r = parseInterviewerReply('[[PHASE:2]] Alright, let us move to some coding. Open the editor.')
    expect(r.control.phase).toBe(2)
    expect(r.text).toMatch(/^Alright/)
  })

  it('extracts a WARN token and strips it from the spoken text', () => {
    const r = parseInterviewerReply('[[WARN]] Please stay on the interview screen.')
    expect(r.control.warn).toBe(true)
    expect(r.text).toBe('Please stay on the interview screen.')
  })

  it('extracts END with a reason', () => {
    const r = parseInterviewerReply('[[END:integrity]] I have to end the interview here. Thank you.')
    expect(r.control.end).toBe('integrity')
    expect(r.text).toMatch(/^I have to end/)
  })

  it('defaults END reason to completed', () => {
    expect(parseInterviewerReply('[[END]] Thanks for your time.').control.end).toBe('completed')
  })

  it('handles a WARN followed by an END token', () => {
    const r = parseInterviewerReply('[[WARN]] [[END:misconduct]] That concludes this session.')
    expect(r.control.warn).toBe(true)
    expect(r.control.end).toBe('misconduct')
    expect(r.text).toBe('That concludes this session.')
  })

  it('is case-insensitive and tolerates whitespace', () => {
    const r = parseInterviewerReply('[[ end:time ]] Time is up, thank you.')
    expect(r.control.end).toBe('time')
  })
})
