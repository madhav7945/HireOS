// ============================================================
// Zoe's toolbox — OpenAI/Groq function-calling schemas + executors.
//
// `TOOL_SCHEMAS` is sent to the model so it knows what it can call.
// `executeTool(name, args, ctx)` runs the matching executor against the data
// layer (localDataService — the same store the whole app reads/writes), and
// returns a plain JSON-able result that's fed back to the model.
//
// ctx carries UI side-effect hooks: { navigate, invalidate }.
//   - navigate(path): react-router navigation
//   - invalidate(): refresh React Query caches so the UI reflects changes
// ============================================================
import { localDataService } from './localData'

// ---- Reusable JSON-schema fragments ----
const str = (description) => ({ type: 'string', description })
const num = (description) => ({ type: 'number', description })
const bool = (description) => ({ type: 'boolean', description })

const NAV_PATHS = [
  'dashboard', 'jobs', 'jobs/create', 'candidates', 'applications', 'pipeline',
  'interviews', 'meetings', 'offers', 'departments', 'calendar', 'ai-shortlist', 'job-boards',
  'referrals', 'reports', 'settings', 'my-actions',
]

// Natural-language → canonical screen, so the model (or user phrasing) can say
// "hiring pipeline", "applicants", "post a job", "todos"… and still land right.
const NAV_ALIASES = {
  home: 'dashboard', overview: 'dashboard',
  'hiring pipeline': 'pipeline', 'hiring-pipeline': 'pipeline', 'candidate pipeline': 'pipeline', 'recruitment pipeline': 'pipeline', kanban: 'pipeline',
  job: 'jobs', 'job openings': 'jobs', openings: 'jobs', roles: 'jobs', 'job listings': 'jobs',
  'create job': 'jobs/create', 'new job': 'jobs/create', 'post job': 'jobs/create', 'post a job': 'jobs/create', 'add job': 'jobs/create',
  applicants: 'candidates', people: 'candidates', talent: 'candidates',
  application: 'applications',
  interview: 'interviews',
  meeting: 'meetings', 'manual meeting': 'meetings', 'manual interview': 'meetings', 'video call': 'meetings',
  offer: 'offers',
  department: 'departments', teams: 'departments',
  schedule: 'calendar', events: 'calendar',
  shortlist: 'ai-shortlist', 'ai shortlist': 'ai-shortlist', 'ai screening': 'ai-shortlist',
  'job boards': 'job-boards', boards: 'job-boards', 'job board': 'job-boards',
  referral: 'referrals',
  analytics: 'reports', report: 'reports',
  setting: 'settings',
  'my actions': 'my-actions', tasks: 'my-actions', todos: 'my-actions', 'to-dos': 'my-actions', reminders: 'my-actions', 'action items': 'my-actions',
}

// Resolve any reasonable phrasing to a canonical screen path (or null).
function resolveNavPath(raw) {
  let s = String(raw || '').trim().toLowerCase().replace(/^\/+/, '').replace(/\s+/g, ' ')
  if (NAV_PATHS.includes(s)) return s
  if (NAV_ALIASES[s]) return NAV_ALIASES[s]
  const stripped = s.replace(/\b(page|screen|view|section|tab)\b/g, '').replace(/^(the|hiring|recruitment|go to|open|show|take me to)\s+/g, '').trim()
  if (NAV_PATHS.includes(stripped)) return stripped
  if (NAV_ALIASES[stripped]) return NAV_ALIASES[stripped]
  // last resort: substring against canonical paths (e.g. "job-boards" in "job boards page")
  return NAV_PATHS.find((p) => stripped.includes(p) || stripped.replace(/-/g, ' ').includes(p.replace(/-/g, ' '))) || null
}

export const TOOL_SCHEMAS = [
  // ---------- JOBS ----------
  fn('listJobs', 'List or search job openings. Use to find a job before updating/deleting, or to answer questions about roles.', {
    query: str('Optional case-insensitive text to match against title/department/location.'),
    status: str('Optional filter: draft | live | paused | closed.'),
  }),
  fn('createJob', 'Create a new job opening.', {
    title: str('Job title, e.g. "Senior Backend Engineer". REQUIRED.'),
    department: str('Department name.'),
    location: str('Location, e.g. "Bangalore, India" or "Remote".'),
    type: str('Full-time | Part-time | Contract | Internship.'),
    workMode: str('Remote | Hybrid | On-site.'),
    openings: num('Number of openings (default 1).'),
    status: str('draft | live | paused (default draft).'),
    priority: str('normal | high | urgent.'),
    skills: { type: 'array', items: { type: 'string' }, description: 'Required skills.' },
  }, ['title']),
  fn('updateJob', 'Update fields on an existing job. Identify it by id OR by title — you do not have to list first.', {
    id: str('Job id (preferred if you have it).'),
    title: str('Job title to match, if you do not have the id.'),
    updates: { type: 'object', description: 'Object of fields to change, e.g. {"status":"live","priority":"urgent"}.' },
  }, ['updates']),
  fn('deleteJob', 'Delete a job (by id OR title). Requires confirmation: call with confirmed=false first, then confirmed=true after the user agrees.', {
    id: str('Job id (preferred if you have it).'),
    title: str('Job title to match, if you do not have the id.'),
    confirmed: bool('Set true ONLY after the user explicitly confirms the deletion.'),
  }, []),

  // ---------- CANDIDATES ----------
  fn('listCandidates', 'List or search candidates.', {
    query: str('Optional text to match name/email/role/company.'),
    stage: str('Optional stage filter, e.g. Applied | Screening | Shortlisted | Interview | Offer | Hired | Rejected.'),
  }),
  fn('createCandidate', 'Add a new candidate.', {
    name: str('Full name. REQUIRED.'),
    email: str('Email address.'),
    phone: str('Phone number.'),
    currentTitle: str('Current job title.'),
    currentCompany: str('Current company.'),
    appliedFor: str('Role they are applying for.'),
    stage: str('Pipeline stage (default Applied).'),
    skills: { type: 'array', items: { type: 'string' } },
  }, ['name']),
  fn('updateCandidate', 'Update a candidate (by id OR name).', {
    id: str('Candidate id (preferred if you have it).'),
    name: str('Candidate name to match, if you do not have the id.'),
    updates: { type: 'object', description: 'Fields to change, e.g. {"stage":"Shortlisted"}.' },
  }, ['updates']),
  fn('deleteCandidate', 'Delete a candidate (by id OR name). Requires confirmation (confirmed=true).', {
    id: str('Candidate id (preferred if you have it).'),
    name: str('Candidate name to match, if you do not have the id.'),
    confirmed: bool('True only after explicit user confirmation.'),
  }, []),

  // ---------- APPLICATIONS ----------
  fn('listApplications', 'List job applications and their pipeline stage/status.', {
    query: str('Optional text to match applicant name/posting.'),
    stage: str('Optional stage filter.'),
  }),
  fn('updateApplicationStage', 'Move an application through the pipeline (identify by id OR the applicant name).', {
    id: str('Application id (preferred if you have it).'),
    name: str('Applicant name to match, if you do not have the id.'),
    stage: str('New stage: Applied | Screening | Shortlisted | Interview | Offer | Hired | Rejected. REQUIRED.'),
    status: str('Optional status label, e.g. New | In-Review | Offered.'),
  }, ['stage']),

  // ---------- INTERVIEWS ----------
  fn('listInterviews', 'List interviews.', { query: str('Optional text to match candidate/role.') }),
  fn('scheduleInterview', 'Schedule an interview (generates a shareable interview link).', {
    candidate: str('Candidate name. REQUIRED.'),
    email: str('Candidate email.'),
    role: str('Role being interviewed for.'),
    type: str('AI Interview | HR Interview | Panel (default AI Interview).'),
    date: str('Human date, e.g. "Jun 22, 2026".'),
    time: str('Time, e.g. "10:00 AM".'),
  }, ['candidate']),
  fn('updateInterviewStatus', 'Update an interview status (identify by id OR the candidate name).', {
    id: str('Interview id (preferred if you have it).'),
    candidate: str('Candidate name to match, if you do not have the id.'),
    status: str('scheduled | live | complete | cancelled. REQUIRED.'),
  }, ['status']),

  // ---------- OFFERS ----------
  fn('listOffers', 'List offers.', { query: str('Optional text to match candidate/role.') }),
  fn('createOffer', 'Create an offer.', {
    candidate: str('Candidate name. REQUIRED.'),
    role: str('Role.'),
    department: str('Department.'),
    salary: str('Salary string, e.g. "INR 28,00,000".'),
    status: str('draft | sent (default draft).'),
  }, ['candidate']),
  fn('updateOffer', 'Update an offer, e.g. mark sent/accepted (identify by id OR the candidate name).', {
    id: str('Offer id (preferred if you have it).'),
    candidate: str('Candidate name to match, if you do not have the id.'),
    updates: { type: 'object', description: 'Fields to change, e.g. {"status":"sent"}.' },
  }, ['updates']),

  // ---------- DEPARTMENTS ----------
  fn('listDepartments', 'List departments.', {}),
  fn('createDepartment', 'Create a department.', {
    name: str('Department name. REQUIRED.'),
    lead: str('Department lead/head.'),
    parent: str('Parent department name, if any.'),
  }, ['name']),
  fn('deleteDepartment', 'Delete a department (by id OR name). Requires confirmation (confirmed=true).', {
    id: str('Department id (preferred if you have it).'),
    name: str('Department name to match, if you do not have the id.'),
    confirmed: bool('True only after explicit user confirmation.'),
  }, []),

  // ---------- CALENDAR ----------
  fn('listCalendarEvents', 'List calendar events.', {}),
  fn('createCalendarEvent', 'Create a calendar event.', {
    title: str('Event title. REQUIRED.'),
    event_type: str('interview | meeting | deadline | other.'),
    start_time: str('ISO datetime, e.g. "2026-06-22T10:00:00".'),
    end_time: str('ISO datetime.'),
  }, ['title']),

  // ---------- TASKS & REMINDERS ----------
  fn('listTasks', 'List the user\'s tasks and reminders.', {
    includeDone: bool('Include completed tasks (default false).'),
  }),
  fn('createTask', 'Add a to-do task or a reminder for the user.', {
    title: str('What to do, e.g. "Review shortlist for Backend role". REQUIRED.'),
    type: str('task | reminder (default task).'),
    priority: str('normal | high | urgent.'),
    dueDate: str('Due date as YYYY-MM-DD if known.'),
    related: str('Optional related job/candidate name.'),
  }, ['title']),
  fn('completeTask', 'Mark a task/reminder as done (identify by id OR its title text).', {
    id: str('Task id (preferred if you have it).'),
    title: str('Task title to match, if you do not have the id, e.g. "call Jhon".'),
  }, []),
  fn('deleteTask', 'Delete a task/reminder (by id OR its title text). Requires confirmation (confirmed=true).', {
    id: str('Task id (preferred if you have it).'),
    title: str('Task title to match, if you do not have the id, e.g. "call Jhon".'),
    confirmed: bool('True only after explicit user confirmation.'),
  }, []),

  // ---------- NAVIGATION ----------
  fn('navigate', `Take the user to a HireOS screen. Allowed: ${NAV_PATHS.join(', ')}.`, {
    path: str('One of the allowed screen paths (no leading slash).'),
  }, ['path']),
]

function fn(name, description, properties, required = []) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties, required },
    },
  }
}

// ---- helpers ----
const ok = (message, data) => ({ ok: true, message, ...(data !== undefined ? { data } : {}) })
const fail = (message) => ({ ok: false, message })
const needsConfirm = (what) => ({ ok: false, needsConfirmation: true, message: `Deleting ${what} can't be undone — reply "yes" to confirm and I'll remove it.` })

function matches(item, query, fields) {
  if (!query) return true
  const q = String(query).toLowerCase()
  return fields.some((f) => String(item?.[f] ?? '').toLowerCase().includes(q))
}

/**
 * Resolve a single record by id OR by a human name/title, so the model doesn't
 * have to perfectly chain a list→id call before acting. Returns one of:
 *   { item }                 — found exactly one (or by id)
 *   { item: null }           — nothing matched
 *   { ambiguous: [...] }     — name matched 2+ records; caller should ask which
 * Name matching prefers an exact (case-insensitive) hit, then falls back to a
 * substring contains.
 */
async function resolveOne(collection, { id, name }, nameFields) {
  const items = await localDataService.list(collection)
  if (id) {
    const byId = items.find((i) => String(i.id) === String(id))
    if (byId) return { item: byId }
  }
  if (name) {
    const q = String(name).trim().toLowerCase()
    const exact = items.filter((i) => nameFields.some((f) => String(i?.[f] ?? '').toLowerCase() === q))
    const pool = exact.length ? exact : items.filter((i) => nameFields.some((f) => String(i?.[f] ?? '').toLowerCase().includes(q)))
    if (pool.length === 1) return { item: pool[0] }
    if (pool.length > 1) return { ambiguous: pool }
    return { item: null }
  }
  return { item: null }
}

const ambiguousMsg = (label, list, field) =>
  fail(`Multiple ${label} match: ${list.map((x) => x[field]).filter(Boolean).join('; ')}. Tell me which one (or give its id).`)

// Trim records to the fields worth showing the model (keeps context small).
const slimJob = (j) => ({ id: j.id, title: j.title, department: j.department, location: j.location, status: j.status, priority: j.priority, openings: j.openings, applied: j.applied })
const slimCandidate = (c) => ({ id: c.id, name: c.name, email: c.email, appliedFor: c.appliedFor, stage: c.stage, aiScore: c.aiScore, currentCompany: c.currentCompany })
const slimApp = (a) => ({ id: a.id, name: a.name, postingTitle: a.postingTitle, stage: a.stage, status: a.status, rating: a.rating })
const slimInterview = (i) => ({ id: i.id, candidate: i.candidate, role: i.role, status: i.status, date: i.date, time: i.time, score: i.score, link: i.interview_link })
const slimOffer = (o) => ({ id: o.id, candidate: o.candidate, role: o.role, salary: o.salary, status: o.status })
const slimTask = (t) => ({ id: t.id, title: t.title, type: t.type, priority: t.priority, done: t.done, dueDate: t.dueDate })

// ---- The executor registry ----
const executors = {
  // JOBS
  async listJobs({ query, status }) {
    let jobs = await localDataService.list('jobs')
    if (status) jobs = jobs.filter((j) => String(j.status).toLowerCase() === String(status).toLowerCase())
    jobs = jobs.filter((j) => matches(j, query, ['title', 'department', 'location', 'jobId']))
    return ok(`${jobs.length} job(s) found.`, jobs.map(slimJob))
  },
  async createJob(args, ctx) {
    if (!args.title) return fail('A job title is required.')
    const existing = (await localDataService.list('jobs')).find(
      (j) => j.title?.toLowerCase() === args.title.toLowerCase() && (!args.department || j.department === args.department),
    )
    if (existing) return ok(`A job titled "${args.title}" already exists (id ${existing.id}). Created nothing new — confirm if you want a duplicate.`, slimJob(existing))
    const job = await localDataService.create('jobs', args)
    ctx?.invalidate?.()
    return ok(`Created job "${job.title}" (${job.status}).`, slimJob(job))
  },
  async updateJob({ id, title, updates }, ctx) {
    const r = await resolveOne('jobs', { id, name: title }, ['title', 'jobId'])
    if (r.ambiguous) return ambiguousMsg('jobs', r.ambiguous, 'title')
    if (!r.item) return fail(`No job found${title ? ` matching "${title}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('jobs', r.item.id, updates || {})
    ctx?.invalidate?.()
    return ok(`Updated job "${updated.title}".`, slimJob(updated))
  },
  async deleteJob({ id, title, confirmed }, ctx) {
    const r = await resolveOne('jobs', { id, name: title }, ['title', 'jobId'])
    if (r.ambiguous) return ambiguousMsg('jobs', r.ambiguous, 'title')
    const job = r.item
    if (!job) return fail(`No job found${title ? ` matching "${title}"` : id ? ` with id ${id}` : ''}.`)
    if (!confirmed) return needsConfirm(`the job "${job.title}"`)
    await localDataService.remove('jobs', job.id)
    ctx?.invalidate?.()
    return ok(`Deleted job "${job.title}".`)
  },

  // CANDIDATES
  async listCandidates({ query, stage }) {
    let list = await localDataService.list('candidates')
    if (stage) list = list.filter((c) => String(c.stage).toLowerCase() === String(stage).toLowerCase())
    list = list.filter((c) => matches(c, query, ['name', 'email', 'appliedFor', 'currentCompany', 'candidateId']))
    return ok(`${list.length} candidate(s) found.`, list.map(slimCandidate))
  },
  async createCandidate(args, ctx) {
    if (!args.name) return fail('A candidate name is required.')
    if (args.email) {
      const dup = (await localDataService.list('candidates')).find((c) => c.email?.toLowerCase() === args.email.toLowerCase())
      if (dup) return ok(`A candidate with email ${args.email} already exists (${dup.name}). Created nothing new.`, slimCandidate(dup))
    }
    const c = await localDataService.create('candidates', args)
    ctx?.invalidate?.()
    return ok(`Added candidate ${c.name}.`, slimCandidate(c))
  },
  async updateCandidate({ id, name, updates }, ctx) {
    const r = await resolveOne('candidates', { id, name }, ['name', 'email', 'candidateId'])
    if (r.ambiguous) return ambiguousMsg('candidates', r.ambiguous, 'name')
    if (!r.item) return fail(`No candidate found${name ? ` matching "${name}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('candidates', r.item.id, updates || {})
    ctx?.invalidate?.()
    return ok(`Updated ${updated.name}.`, slimCandidate(updated))
  },
  async deleteCandidate({ id, name, confirmed }, ctx) {
    const r = await resolveOne('candidates', { id, name }, ['name', 'email', 'candidateId'])
    if (r.ambiguous) return ambiguousMsg('candidates', r.ambiguous, 'name')
    const c = r.item
    if (!c) return fail(`No candidate found${name ? ` matching "${name}"` : id ? ` with id ${id}` : ''}.`)
    if (!confirmed) return needsConfirm(`the candidate "${c.name}"`)
    await localDataService.remove('candidates', c.id)
    ctx?.invalidate?.()
    return ok(`Deleted candidate ${c.name}.`)
  },

  // APPLICATIONS
  async listApplications({ query, stage }) {
    let list = await localDataService.list('applications')
    if (stage) list = list.filter((a) => String(a.stage).toLowerCase() === String(stage).toLowerCase())
    list = list.filter((a) => matches(a, query, ['name', 'postingTitle']))
    return ok(`${list.length} application(s) found.`, list.map(slimApp))
  },
  async updateApplicationStage({ id, name, stage, status }, ctx) {
    if (!stage) return fail('A target stage is required.')
    const r = await resolveOne('applications', { id, name }, ['name', 'postingTitle'])
    if (r.ambiguous) return ambiguousMsg('applications', r.ambiguous, 'name')
    if (!r.item) return fail(`No application found${name ? ` matching "${name}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('applications', r.item.id, { stage, ...(status ? { status } : {}) })
    ctx?.invalidate?.()
    return ok(`Moved ${updated.name} to ${stage}.`, slimApp(updated))
  },

  // INTERVIEWS
  async listInterviews({ query }) {
    const list = (await localDataService.list('interviews')).filter((i) => matches(i, query, ['candidate', 'role', 'email']))
    return ok(`${list.length} interview(s) found.`, list.map(slimInterview))
  },
  async scheduleInterview(args, ctx) {
    if (!args.candidate) return fail('A candidate name is required.')
    const i = await localDataService.create('interviews', { ...args, status: 'scheduled' })
    ctx?.invalidate?.()
    return ok(`Scheduled ${args.type || 'AI Interview'} for ${i.candidate}${i.date ? ` on ${i.date}` : ''}.`, slimInterview(i))
  },
  async updateInterviewStatus({ id, candidate, status }, ctx) {
    if (!status) return fail('A status is required.')
    const r = await resolveOne('interviews', { id, name: candidate }, ['candidate', 'role', 'email'])
    if (r.ambiguous) return ambiguousMsg('interviews', r.ambiguous, 'candidate')
    if (!r.item) return fail(`No interview found${candidate ? ` for "${candidate}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('interviews', r.item.id, { status })
    ctx?.invalidate?.()
    return ok(`Interview for ${updated.candidate} set to ${status}.`, slimInterview(updated))
  },

  // OFFERS
  async listOffers({ query }) {
    const list = (await localDataService.list('offers')).filter((o) => matches(o, query, ['candidate', 'role', 'department']))
    return ok(`${list.length} offer(s) found.`, list.map(slimOffer))
  },
  async createOffer(args, ctx) {
    if (!args.candidate) return fail('A candidate name is required.')
    const o = await localDataService.create('offers', { status: 'draft', ...args })
    ctx?.invalidate?.()
    return ok(`Created ${o.status} offer for ${o.candidate}.`, slimOffer(o))
  },
  async updateOffer({ id, candidate, updates }, ctx) {
    const r = await resolveOne('offers', { id, name: candidate }, ['candidate', 'role'])
    if (r.ambiguous) return ambiguousMsg('offers', r.ambiguous, 'candidate')
    if (!r.item) return fail(`No offer found${candidate ? ` for "${candidate}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('offers', r.item.id, updates || {})
    ctx?.invalidate?.()
    return ok(`Updated offer for ${updated.candidate}.`, slimOffer(updated))
  },

  // DEPARTMENTS
  async listDepartments() {
    const list = await localDataService.list('departments')
    return ok(`${list.length} department(s).`, list.map((d) => ({ id: d.id, name: d.name, lead: d.lead, openJobs: d.openJobs, employees: d.employees })))
  },
  async createDepartment(args, ctx) {
    if (!args.name) return fail('A department name is required.')
    const d = await localDataService.create('departments', args)
    ctx?.invalidate?.()
    return ok(`Created department ${d.name}.`, { id: d.id, name: d.name })
  },
  async deleteDepartment({ id, name, confirmed }, ctx) {
    const r = await resolveOne('departments', { id, name }, ['name'])
    if (r.ambiguous) return ambiguousMsg('departments', r.ambiguous, 'name')
    const d = r.item
    if (!d) return fail(`No department found${name ? ` matching "${name}"` : id ? ` with id ${id}` : ''}.`)
    if (!confirmed) return needsConfirm(`the department "${d.name}"`)
    await localDataService.remove('departments', d.id)
    ctx?.invalidate?.()
    return ok(`Deleted department ${d.name}.`)
  },

  // CALENDAR
  async listCalendarEvents() {
    const list = await localDataService.list('calendarEvents')
    return ok(`${list.length} event(s).`, list.map((e) => ({ id: e.id, title: e.title, type: e.event_type, start: e.start_time })))
  },
  async createCalendarEvent(args, ctx) {
    if (!args.title) return fail('An event title is required.')
    const e = await localDataService.create('calendarEvents', { event_type: 'meeting', ...args })
    ctx?.invalidate?.()
    return ok(`Created event "${e.title}".`, { id: e.id, title: e.title })
  },

  // TASKS
  async listTasks({ includeDone }) {
    let list = await localDataService.list('tasks')
    if (!includeDone) list = list.filter((t) => !t.done)
    return ok(`${list.length} task(s).`, list.map(slimTask))
  },
  async createTask(args, ctx) {
    if (!args.title) return fail('A task title is required.')
    const t = await localDataService.create('tasks', args)
    ctx?.invalidate?.()
    return ok(`Added ${t.type} "${t.title}"${t.dueDate ? ` (due ${t.dueDate})` : ''}.`, slimTask(t))
  },
  async completeTask({ id, title }, ctx) {
    const r = await resolveOne('tasks', { id, name: title }, ['title'])
    if (r.ambiguous) return ambiguousMsg('tasks', r.ambiguous, 'title')
    if (!r.item) return fail(`No task found${title ? ` matching "${title}"` : id ? ` with id ${id}` : ''}.`)
    const updated = await localDataService.update('tasks', r.item.id, { done: true })
    ctx?.invalidate?.()
    return ok(`Marked "${updated.title}" done.`, slimTask(updated))
  },
  async deleteTask({ id, title, confirmed }, ctx) {
    const r = await resolveOne('tasks', { id, name: title }, ['title'])
    if (r.ambiguous) return ambiguousMsg('tasks', r.ambiguous, 'title')
    const t = r.item
    if (!t) return fail(`No task found${title ? ` matching "${title}"` : id ? ` with id ${id}` : ''}.`)
    if (!confirmed) return needsConfirm(`the task "${t.title}"`)
    await localDataService.remove('tasks', t.id)
    ctx?.invalidate?.()
    return ok(`Deleted task "${t.title}".`)
  },

  // NAVIGATION
  async navigate({ path }, ctx) {
    const target = resolveNavPath(path)
    if (!target) return fail(`"${path}" isn't a screen I can open. Try one of: ${NAV_PATHS.join(', ')}.`)
    if (typeof ctx?.navigate !== 'function') return fail("I couldn't actually change the screen (navigation isn't available right now).")
    ctx.navigate(`/${target === 'dashboard' ? '' : target}`)
    return ok(`Opened ${target.replace('-', ' ')}.`)
  },
}

export const TOOL_NAMES = Object.keys(executors)

/**
 * Execute a tool by name. Always resolves to a JSON-able result object
 * ({ ok, message, ... }); never throws, so the agent loop stays alive.
 */
export async function executeTool(name, args = {}, ctx = {}) {
  const exec = executors[name]
  if (!exec) return fail(`Unknown tool "${name}".`)
  try {
    return await exec(args, ctx)
  } catch (err) {
    return fail(`Tool "${name}" failed: ${err?.message || err}`)
  }
}
