import { describe, it, expect } from 'vitest'
import { generateIndeedXML } from './generateIndeedXML'

const baseJob = {
  id: 'job-1',
  title: 'Senior React Developer',
  status: 'live',
  location: 'Bangalore, India',
  type: 'Full-time',
  department: 'Engineering',
  description: 'Build great UIs.',
  salary: { min: 2000000, max: 3500000, currency: 'INR', period: 'year' },
}

describe('generateIndeedXML', () => {
  it('produces a well-formed feed with the publisher header', () => {
    const xml = generateIndeedXML([baseJob], 'https://hire.test')
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>')
    expect(xml).toContain('<publisher>HireOS</publisher>')
    expect(xml).toContain('<publisherurl>https://hire.test</publisherurl>')
  })

  it('only includes live/open jobs', () => {
    const xml = generateIndeedXML(
      [baseJob, { ...baseJob, id: 'job-2', title: 'Drafted', status: 'draft' }],
      'https://hire.test',
    )
    expect(xml).toContain('Senior React Developer')
    expect(xml).not.toContain('Drafted')
  })

  it('builds the apply URL from siteUrl + job id', () => {
    const xml = generateIndeedXML([baseJob], 'https://hire.test')
    expect(xml).toContain('<url>https://hire.test/apply/job-1</url>')
  })

  it('maps job type to Indeed jobtype values', () => {
    const contract = generateIndeedXML([{ ...baseJob, type: 'Contract' }], 'https://x')
    expect(contract).toContain('<jobtype>contract</jobtype>')
    const intern = generateIndeedXML([{ ...baseJob, type: 'Internship' }], 'https://x')
    expect(intern).toContain('<jobtype>internship</jobtype>')
  })

  it('formats the salary range and omits it when absent', () => {
    const withSalary = generateIndeedXML([baseJob], 'https://x')
    expect(withSalary).toContain('2000000-3500000 INR/year')
    const { salary, ...noSalary } = baseJob
    const without = generateIndeedXML([noSalary], 'https://x')
    expect(without).not.toContain('<salary>')
  })
})
