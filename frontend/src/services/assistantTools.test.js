import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executeTool, TOOL_SCHEMAS, TOOL_NAMES } from './assistantTools'
import { localDataService } from './localData'

beforeEach(() => {
  window.localStorage.clear()
})

describe('tool schemas', () => {
  it('every advertised schema has a matching executor', () => {
    const schemaNames = TOOL_SCHEMAS.map((t) => t.function.name)
    for (const name of schemaNames) expect(TOOL_NAMES).toContain(name)
  })

  it('schemas are valid function definitions', () => {
    for (const t of TOOL_SCHEMAS) {
      expect(t.type).toBe('function')
      expect(typeof t.function.name).toBe('string')
      expect(t.function.parameters.type).toBe('object')
    }
  })
})

describe('jobs tools', () => {
  it('creates, finds, updates, and deletes a job (with confirmation gate)', async () => {
    const created = await executeTool('createJob', { title: 'QA Engineer', department: 'Engineering', status: 'live' })
    expect(created.ok).toBe(true)
    const id = created.data.id

    const found = await executeTool('listJobs', { query: 'qa engineer' })
    expect(found.data.some((j) => j.id === id)).toBe(true)

    const filtered = await executeTool('listJobs', { status: 'live' })
    expect(filtered.data.every((j) => j.status === 'live')).toBe(true)

    const updated = await executeTool('updateJob', { id, updates: { priority: 'urgent' } })
    expect(updated.ok).toBe(true)

    // delete requires confirmation
    const blocked = await executeTool('deleteJob', { id })
    expect(blocked.ok).toBe(false)
    expect(blocked.needsConfirmation).toBe(true)

    const deleted = await executeTool('deleteJob', { id, confirmed: true })
    expect(deleted.ok).toBe(true)
    const gone = await localDataService.get('jobs', id)
    expect(gone).toBeNull()
  })

  it('refuses to silently create a duplicate job', async () => {
    await executeTool('createJob', { title: 'Dup Role', department: 'Eng' })
    const second = await executeTool('createJob', { title: 'Dup Role', department: 'Eng' })
    expect(second.message).toMatch(/already exists/i)
  })

  it('requires a title to create a job', async () => {
    const r = await executeTool('createJob', {})
    expect(r.ok).toBe(false)
  })
})

describe('candidate + application pipeline tools', () => {
  it('flags a duplicate candidate by email', async () => {
    await executeTool('createCandidate', { name: 'Arjun', email: 'a@x.com' })
    const dup = await executeTool('createCandidate', { name: 'Arjun Two', email: 'a@x.com' })
    expect(dup.message).toMatch(/already exists/i)
  })

  it('moves an application to a new stage', async () => {
    const app = await localDataService.create('applications', { name: 'Neha', stage: 'Applied', status: 'New' })
    const moved = await executeTool('updateApplicationStage', { id: app.id, stage: 'Interview', status: 'In-Review' })
    expect(moved.ok).toBe(true)
    const updated = await localDataService.get('applications', app.id)
    expect(updated.stage).toBe('Interview')
  })
})

describe('tasks/reminders tools', () => {
  it('creates, completes, and deletes a task', async () => {
    const t = await executeTool('createTask', { title: 'Review shortlist', type: 'reminder', dueDate: '2026-06-20' })
    expect(t.ok).toBe(true)
    const id = t.data.id

    const done = await executeTool('completeTask', { id })
    expect(done.ok).toBe(true)
    expect(done.data.done).toBe(true)

    const blocked = await executeTool('deleteTask', { id })
    expect(blocked.needsConfirmation).toBe(true)
    const deleted = await executeTool('deleteTask', { id, confirmed: true })
    expect(deleted.ok).toBe(true)
  })

  it('completes and deletes a task by TITLE (no id needed)', async () => {
    await executeTool('createTask', { title: 'Call Jhon', type: 'reminder', priority: 'urgent' })

    const done = await executeTool('completeTask', { title: 'call jhon' }) // case-insensitive
    expect(done.ok).toBe(true)
    expect(done.data.title).toBe('Call Jhon')

    const blocked = await executeTool('deleteTask', { title: 'Call Jhon' })
    expect(blocked.needsConfirmation).toBe(true)
    const deleted = await executeTool('deleteTask', { title: 'Call Jhon', confirmed: true })
    expect(deleted.ok).toBe(true)
    const remaining = await executeTool('listTasks', { includeDone: true })
    expect(remaining.data.some((t) => t.title === 'Call Jhon')).toBe(false)
  })

  it('asks which when a title is ambiguous', async () => {
    await executeTool('createTask', { title: 'Call vendor A' })
    await executeTool('createTask', { title: 'Call vendor B' })
    const r = await executeTool('deleteTask', { title: 'call vendor', confirmed: true })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/multiple/i)
  })

  it('hides done tasks unless includeDone is set', async () => {
    const t = await executeTool('createTask', { title: 'One-off' })
    await executeTool('completeTask', { id: t.data.id })
    const open = await executeTool('listTasks', {})
    expect(open.data.some((x) => x.id === t.data.id)).toBe(false)
    const all = await executeTool('listTasks', { includeDone: true })
    expect(all.data.some((x) => x.id === t.data.id)).toBe(true)
  })
})

describe('navigation tool', () => {
  it('navigates to a valid screen and rejects an invalid one', async () => {
    const navigate = vi.fn()
    const okNav = await executeTool('navigate', { path: 'pipeline' }, { navigate })
    expect(okNav.ok).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/pipeline')

    const dash = await executeTool('navigate', { path: 'dashboard' }, { navigate })
    expect(navigate).toHaveBeenLastCalledWith('/')
    expect(dash.ok).toBe(true)

    const bad = await executeTool('navigate', { path: 'nope' }, { navigate })
    expect(bad.ok).toBe(false)
  })

  it('resolves natural-language screen names to the right route', async () => {
    const navigate = vi.fn()
    await executeTool('navigate', { path: 'hiring pipeline' }, { navigate })
    expect(navigate).toHaveBeenLastCalledWith('/pipeline')
    await executeTool('navigate', { path: 'post a job' }, { navigate })
    expect(navigate).toHaveBeenLastCalledWith('/jobs/create')
    await executeTool('navigate', { path: 'my actions' }, { navigate })
    expect(navigate).toHaveBeenLastCalledWith('/my-actions')
  })

  it('does not claim success if navigation is unavailable', async () => {
    const r = await executeTool('navigate', { path: 'pipeline' }, {})
    expect(r.ok).toBe(false)
  })
})

describe('unknown tool', () => {
  it('returns a failure rather than throwing', async () => {
    const r = await executeTool('frobnicate', {})
    expect(r.ok).toBe(false)
  })
})
