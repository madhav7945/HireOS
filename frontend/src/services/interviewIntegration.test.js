import { describe, it, expect, vi } from 'vitest'
import { getQuestionsForRole, QUESTION_BANK } from '../data/questionBank'
import { getTieredHint, parseInterviewerReply, generateDetailedAnalysis } from './interviewAI'
import { runCode, formatRunOutput, summarizeRun } from '../utils/codeRunner'

describe('End-to-End AI Interview Integration Pipeline', () => {
  it('1. Role-Adaptive Question Retrieval: matches domains correctly', () => {
    const frontendQuestions = getQuestionsForRole({ role: 'React Developer', count: 2 })
    expect(frontendQuestions.length).toBe(2)
    expect(frontendQuestions[0].starterCode.javascript).toBeDefined()
    expect(frontendQuestions[0].tests.length).toBeGreaterThanOrEqual(2)

    const backendQuestions = getQuestionsForRole({ role: 'Python / Django Engineer', count: 2 })
    expect(backendQuestions.length).toBe(2)
    expect(backendQuestions.some(q => q.domain === 'backend')).toBe(true)

    const devopsQuestions = getQuestionsForRole({ role: 'DevOps / SRE Engineer', count: 2 })
    expect(devopsQuestions.length).toBe(2)
    expect(devopsQuestions.some(q => q.domain === 'devops')).toBe(true)
  })

  it('2. Progressive Hint System: delivers tiered hints without code spoiling', async () => {
    const question = QUESTION_BANK.backend[0] // Two Sum
    const hint1 = await getTieredHint({ role: 'Software Engineer', question, code: '', language: 'javascript', level: 1 })
    const hint2 = await getTieredHint({ role: 'Software Engineer', question, code: '', language: 'javascript', level: 2 })
    const hint3 = await getTieredHint({ role: 'Software Engineer', question, code: '', language: 'javascript', level: 3 })

    expect(hint1).toBeTruthy()
    expect(hint2).toBeTruthy()
    expect(hint3).toBeTruthy()
    expect(typeof hint1).toBe('string')
    expect(hint1).not.toBe(hint2)
    expect(hint2).not.toBe(hint3)
  }, 25000)

  it('3. Code Runner Sandbox: executes test cases and computes accurate pass/fail results', async () => {
    const question = QUESTION_BANK.backend[0] // Two Sum
    // Correct solution
    const validCode = `
      function twoSum(nums, target) {
        const seen = new Map();
        for (let i = 0; i < nums.length; i++) {
          const comp = target - nums[i];
          if (seen.has(comp)) {
            return [seen.get(comp), i];
          }
          seen.set(nums[i], i);
        }
        return [];
      }
    `
    const result = await runCode({
      language: 'javascript',
      code: validCode,
      fnName: 'twoSum',
      tests: question.tests,
    })

    expect(result.ok).toBe(true)
    expect(result.results.length).toBe(question.tests.length)
    expect(result.results.every(r => r.pass)).toBe(true)

    const summary = summarizeRun(result)
    expect(summary).toContain('passed')

    // Incorrect solution test
    const buggyCode = `
      function twoSum(nums, target) {
        return [0, 0];
      }
    `
    const failResult = await runCode({
      language: 'javascript',
      code: buggyCode,
      fnName: 'twoSum',
      tests: question.tests,
    })

    expect(failResult.ok).toBe(false)
    expect(failResult.results.some(r => !r.pass)).toBe(true)
  })

  it('4. Control Token Parser: properly handles tokens for flow control', () => {
    const rawWithTokens = '[[PHASE:2]] [[WARN]] Welcome to phase 2, please stay focused.'
    const { text, control } = parseInterviewerReply(rawWithTokens)
    expect(control.phase).toBe(2)
    expect(control.warn).toBe(true)
    expect(text).toBe('Welcome to phase 2, please stay focused.')

    const rawEnd = '[[END:completed]] Thank you for your time today.'
    const parsedEnd = parseInterviewerReply(rawEnd)
    expect(parsedEnd.control.end).toBe('completed')
    expect(parsedEnd.text).toBe('Thank you for your time today.')
  })

  it('5. Detailed Analysis Generator: produces comprehensive post-interview audit', async () => {
    const analysis = await generateDetailedAnalysis({
      role: 'Frontend Engineer',
      candidateName: 'Alex Morgan',
      transcript: [
        { sender: 'ai', content: 'Tell me about your experience with state management.' },
        { sender: 'candidate', content: 'I have worked extensively with React state, Redux, and custom hooks.' },
        { sender: 'ai', content: 'Great. Let us try a debounce utility implementation.' },
        { sender: 'candidate', content: 'Sure, I will use setTimeout and clearTimeout to delay execution.' }
      ],
      code: { 0: 'function debounce(fn, delay) { return fn; }' },
      questions: QUESTION_BANK.frontend.slice(0, 2),
      scores: { codeQuality: 85, communication: 90, problemSolving: 88, confidence: 85, overall: 87 },
      proctoring: { tabSwitchCount: 0, pasteCount: 0, violationScore: 0, events: [] },
      durationMinutes: 30,
      elapsedSeconds: 1200,
    })

    expect(analysis).toBeDefined()
    expect(analysis.candidateName).toBe('Alex Morgan')
    expect(analysis.role).toBe('Frontend Engineer')
    expect(analysis.scores.overall).toBe(87)
    expect(['strong_hire', 'hire', 'maybe', 'no_hire']).toContain(analysis.recommendation)
    expect(analysis.questionAnalysis).toBeInstanceOf(Array)
    expect(analysis.executiveSummary).toBeTruthy()
  }, 25000)
})
