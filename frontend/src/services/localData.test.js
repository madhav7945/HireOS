import { describe, it, expect, beforeEach } from 'vitest'
import { localDataService } from './localData'

beforeEach(() => {
  window.localStorage.clear()
})

describe('localDataService CRUD', () => {
  it('seeds a collection from defaults on first read', async () => {
    const jobs = await localDataService.list('jobs')
    expect(Array.isArray(jobs)).toBe(true)
    expect(jobs.length).toBeGreaterThan(0)
  })

  it('creates a record, prepends it, and normalizes job fields', async () => {
    const job = await localDataService.create('jobs', { title: 'QA Engineer' })
    expect(job.title).toBe('QA Engineer')
    expect(job.jobId).toMatch(/^JOB-\d{5}$/)      // sequential, human-readable id
    expect(job.status).toBe('draft')              // default when no postNow
    expect(job.created_at).toBeTruthy()

    const jobs = await localDataService.list('jobs')
    expect(jobs[0].id).toBe(job.id)               // newest first
  })

  it('assigns increasing sequential ids', async () => {
    const a = await localDataService.create('candidates', { name: 'A' })
    const b = await localDataService.create('candidates', { name: 'B' })
    const na = Number(a.candidateId.split('-')[1])
    const nb = Number(b.candidateId.split('-')[1])
    expect(nb).toBe(na + 1)
  })

  it('gets a record by id and by a custom key', async () => {
    const created = await localDataService.create('interviews', { candidate: 'Z', session_id: 'sess-xyz' })
    const byId = await localDataService.get('interviews', created.id)
    expect(byId.candidate).toBe('Z')
    const bySession = await localDataService.get('interviews', 'sess-xyz', 'session_id')
    expect(bySession.id).toBe(created.id)
  })

  it('updates a record and stamps updated_at', async () => {
    const job = await localDataService.create('jobs', { title: 'Old' })
    const updated = await localDataService.update('jobs', job.id, { title: 'New' })
    expect(updated.title).toBe('New')
    expect(updated.updated_at).toBeTruthy()
  })

  it('removes a record', async () => {
    const job = await localDataService.create('jobs', { title: 'Temp' })
    await localDataService.remove('jobs', job.id)
    const found = await localDataService.get('jobs', job.id)
    expect(found).toBeNull()
  })

  it('falls back to a generic normalizer for unknown collections', async () => {
    const note = await localDataService.create('notes', { text: 'hi' })
    expect(note.id).toBeTruthy()
    expect(note.text).toBe('hi')
  })
})
