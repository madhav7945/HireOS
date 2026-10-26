import { describe, it, expect } from 'vitest'
import { QUESTION_BANK, getQuestionsForRole } from './questionBank'
import { getTieredHint } from '../services/interviewAI'

describe('Comprehensive Question Bank & Role Adaptivity', () => {
  it('contains categorized questions across major engineering domains', () => {
    expect(QUESTION_BANK).toBeDefined()
    expect(QUESTION_BANK.frontend?.length).toBeGreaterThan(0)
    expect(QUESTION_BANK.backend?.length).toBeGreaterThan(0)
    expect(QUESTION_BANK.devops?.length).toBeGreaterThan(0)
    expect(QUESTION_BANK.dataScience?.length).toBeGreaterThan(0)
    expect(QUESTION_BANK.systemDesign?.length).toBeGreaterThan(0)
  })

  it('validates question schema completeness for all questions', () => {
    const allQuestions = Object.values(QUESTION_BANK).flat()
    expect(allQuestions.length).toBeGreaterThanOrEqual(10)

    for (const q of allQuestions) {
      expect(q.id).toBeDefined()
      expect(q.title).toBeTruthy()
      expect(q.category).toBeTruthy()
      expect(['Easy', 'Medium', 'Hard']).toContain(q.difficulty)
      expect(q.starterCode).toBeDefined()
      expect(q.starterCode.javascript).toBeTruthy()
      if (q.category === 'coding') {
        expect(q.tests).toBeInstanceOf(Array)
        expect(q.tests.length).toBeGreaterThanOrEqual(2)
      }
      expect(q.hints).toBeInstanceOf(Array)
      expect(q.hints.length).toBe(3) // 3 progressive hint tiers
      expect(q.hints.map(h => h.level)).toEqual([1, 2, 3])
    }
  })

  it('correctly matches domain questions based on role keywords', () => {
    const feQuestions = getQuestionsForRole({ role: 'Senior React / Frontend Engineer', count: 3 })
    expect(feQuestions.length).toBe(3)
    expect(feQuestions.some(q => q.domain === 'frontend' || q.tags.includes('DOM'))).toBe(true)

    const devopsQuestions = getQuestionsForRole({ role: 'Site Reliability / DevOps Engineer', count: 2 })
    expect(devopsQuestions.length).toBe(2)
    expect(devopsQuestions.some(q => q.domain === 'devops' || q.tags.includes('CI/CD'))).toBe(true)

    const dsQuestions = getQuestionsForRole({ role: 'Machine Learning / Data Scientist', count: 2 })
    expect(dsQuestions.length).toBe(2)
    expect(dsQuestions.some(q => q.domain === 'dataScience' || q.tags.includes('Vectors'))).toBe(true)
  })

  it('returns appropriate fallback progressive hints without full code disclosure', async () => {

    const testQ = QUESTION_BANK.backend[0] // Two Sum
    const hint1 = await getTieredHint({ role: 'Backend Dev', question: testQ, code: '', language: 'javascript', level: 1 })
    const hint2 = await getTieredHint({ role: 'Backend Dev', question: testQ, code: '', language: 'javascript', level: 2 })
    const hint3 = await getTieredHint({ role: 'Backend Dev', question: testQ, code: '', language: 'javascript', level: 3 })

    expect(hint1).toBeTruthy()
    expect(hint2).toBeTruthy()
    expect(hint3).toBeTruthy()
    expect(hint1).not.toEqual(hint2)
    expect(hint2).not.toEqual(hint3)
  }, 25000)
})
