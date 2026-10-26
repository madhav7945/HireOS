// ============================================================
// Hiring Autopilot — the orchestrator that connects every stage of the funnel
// into ONE automatic flow:
//
//   Apply → AI screen → Shortlist → Schedule interview → "Interview today"
//   reminder → Live AI interview → HR analysis → Offer / Rejection
//
// It REUSES the existing services (it does not re-implement them):
//   • aiService.processNewApplication  (ai.js)      — screen + shortlist + emails
//   • emailService.*                   (email.js)   — every templated send
//   • scoreInterview                   (interviewAI.js, already wired in the UI)
//   • localDataService                 (localData.js) — jobs/candidates/interviews/
//                                                       applications/offers/tasks/activity
//
// There is no backend cron in this app, so time-based reminders fire when the app
// is open (checkDueReminders) — and runDemoFlow() fast-forwards the whole chain so
// you can watch it end-to-end without waiting a day.
// ============================================================
import toast from 'react-hot-toast'
import { localDataService } from './localData'
import { aiService } from './ai'
import { emailService } from './email'

// ---- Ordered funnel stages (drives the timeline UI) ----
export const PIPELINE_STAGES = [
  { key: 'applied', label: 'Applied', icon: '📥' },
  { key: 'screening', label: 'AI Screening', icon: '🧠' },
  { key: 'shortlisted', label: 'Shortlisted', icon: '⭐' },
  { key: 'interview_scheduled', label: 'Interview Scheduled', icon: '📅' },
  { key: 'interview_reminder', label: 'Interview Today', icon: '⏰' },
  { key: 'interview_live', label: 'Interview', icon: '🎥' },
  { key: 'hr_analysis', label: 'HR Analysis', icon: '📊' },
  { key: 'offer', label: 'Offer', icon: '🎉' },
  { key: 'rejected', label: 'Not Selected', icon: '🙏' },
  { key: 'hired', label: 'Hired', icon: '✅' },
]

// ---- Autopilot config (persisted, with safe defaults) ----
const CONFIG_KEY = 'hireos.autopilot'
const DEFAULT_CONFIG = {
  autoSchedule: true,   // auto-create + email an interview when shortlisted
  autoReminders: true,  // fire "interview today" reminders
  autoReject: true,     // send a respectful decline when not shortlisted
  autoSendOffer: false, // false = draft offer + HR approval task; true = auto-send offer email
  rankingMode: false,   // true = big-ATS funnel: score on apply but DON'T auto-schedule —
                        // a human ranks + confirms the Top N on the AI Shortlisting page.
}

export function getAutopilotConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(window.localStorage.getItem(CONFIG_KEY) || '{}') }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function setAutopilotConfig(updates) {
  const next = { ...getAutopilotConfig(), ...updates }
  if (typeof window !== 'undefined') window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
  return next
}

// ---- small helpers ----
const nowIso = () => new Date().toISOString()
const dateStr = (d) => d.toISOString().slice(0, 10)

function formatSalary(job) {
  const s = job?.salary
  if (s?.min && s?.max) {
    const fmt = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`)
    return `${s.currency || 'INR'} ${fmt(s.min)}–${fmt(s.max)}/${s.period || 'yr'}`
  }
  return job?.salaryRange || 'Competitive'
}

async function logActivity(entityType, entityId, action, text) {
  try {
    await localDataService.create('activity', { entity_type: entityType, entity_id: entityId, action, details: { text } })
  } catch { /* activity log is best-effort */ }
}

// Append a step to the candidate's visible pipeline timeline.
async function pushTimeline(candidateId, stageKey, detail) {
  if (!candidateId) return
  const candidate = await localDataService.get('candidates', candidateId)
  if (!candidate) return
  const timeline = Array.isArray(candidate.pipelineTimeline) ? candidate.pipelineTimeline : []
  timeline.push({ stage: stageKey, detail, at: nowIso() })
  await localDataService.update('candidates', candidateId, { pipelineTimeline: timeline })
}

// ============================================================
// 1. Application pipeline — screen, shortlist, then auto-schedule the interview.
// ============================================================
export async function runApplicationPipeline({ candidateId, jobId, applicationId = null }) {
  const cfg = getAutopilotConfig()
  const candidate = await localDataService.get('candidates', candidateId)
  const job = await localDataService.get('jobs', jobId)
  if (!candidate || !job) return null

  await pushTimeline(candidateId, 'applied', `Applied for ${job.title}`)

  // Reuse the existing screen + shortlist + emails path (keeps ai.test.js contract).
  const screen = await aiService.processNewApplication(candidateId, jobId, applicationId)
  if (!screen) return null

  await pushTimeline(candidateId, 'screening', `AI score ${screen.evaluation?.score ?? '—'} — ${screen.evaluation?.recommendation || ''}`)

  if (screen.shortlisted) {
    await pushTimeline(candidateId, 'shortlisted', 'Shortlisted by AI screening')
    await logActivity('candidate', candidateId, 'shortlisted', `${candidate.name} shortlisted for ${job.title}`)
    // In ranking mode the Top-N cut + human confirm happens on the AI Shortlisting
    // page, so we DON'T auto-schedule on apply — we just leave the candidate scored
    // and shortlisted, awaiting the recruiter's approval.
    if (cfg.autoSchedule && !cfg.rankingMode) {
      await scheduleAutoInterview({ candidate, job, applicationId })
    } else if (cfg.rankingMode) {
      await pushTimeline(candidateId, 'shortlisted', 'Awaiting Top-N ranking & recruiter approval')
    }
  } else if (cfg.autoReject) {
    await emailService.sendRejectionEmail(candidate.email, candidate.name, job.title)
    await localDataService.update('candidates', candidateId, { stage: 'Rejected' })
    if (applicationId) await localDataService.update('applications', applicationId, { stage: 'Rejected', status: 'Closed' })
    await pushTimeline(candidateId, 'rejected', 'Not shortlisted — decline email sent')
    await logActivity('candidate', candidateId, 'rejected', `${candidate.name} declined for ${job.title}`)
  }

  return screen
}

// Create the interview record (with a real join link) + email the candidate.
export async function scheduleAutoInterview({ candidate, job, applicationId = null, daysFromNow = 1 }) {
  const when = new Date()
  when.setDate(when.getDate() + daysFromNow)
  when.setHours(11, 0, 0, 0)
  const dateLabel = when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeLabel = '11:00 AM'
  const whenStr = `${dateLabel}, ${timeLabel}`

  // localData.normalizeInterview generates session_id + interview_link for us.
  const interview = await localDataService.create('interviews', {
    candidate: candidate.name,
    candidateId: candidate.id,
    jobId: job.id,
    applicationId,
    email: candidate.email,
    role: job.title,
    type: 'AI Interview',
    status: 'scheduled',
    date: dateLabel,
    time: timeLabel,
    scheduledAt: when.toISOString(),
    duration: `${job.interviewDuration || 30} min`,
    aiPersona: job.aiPersona || 'Aria',
  })

  const link = interview.interview_link

  await emailService.sendInterviewScheduled(candidate.email, candidate.name, whenStr)
  await emailService.sendInterviewLink(candidate.email, candidate.name, link)

  await localDataService.update('candidates', candidate.id, { stage: 'Interview Scheduled' })
  if (applicationId) await localDataService.update('applications', applicationId, { stage: 'Interview', status: 'In-Review' })

  await localDataService.create('tasks', {
    title: `Interview: ${candidate.name} — ${job.title}`,
    type: 'reminder',
    priority: 'high',
    dueDate: dateStr(when),
    related: job.title,
  })

  await pushTimeline(candidate.id, 'interview_scheduled', `AI interview scheduled for ${whenStr}`)
  await logActivity('interview', interview.id, 'scheduled', `Interview scheduled for ${candidate.name} (${whenStr})`)
  return interview
}

// ============================================================
// 2. "Interview today" reminders (fired when the app is open).
// ============================================================
export async function checkDueReminders() {
  const cfg = getAutopilotConfig()
  if (!cfg.autoReminders) return 0
  const today = dateStr(new Date())
  const interviews = await localDataService.list('interviews')
  let fired = 0
  for (const iv of interviews) {
    if (iv.status !== 'scheduled' || iv.reminderSentAt) continue
    // Prefer the precise ISO timestamp; fall back to the display date string.
    const day = (iv.scheduledAt || '').slice(0, 10) || iv.date
    if (day !== today) continue
    if (iv.email) {
      await emailService.sendInterviewToday(iv.email, iv.candidate, iv.time || '', iv.interview_link)
    }
    await localDataService.update('interviews', iv.id, { reminderSentAt: nowIso() })
    if (iv.candidateId) await pushTimeline(iv.candidateId, 'interview_reminder', 'Sent "interview today" reminder')
    fired++
  }
  return fired
}

// ============================================================
// 3. After the interview — HR analysis → offer or rejection.
// ============================================================
function decisionFromScores(scores) {
  if (scores?.recommendation) return scores.recommendation
  const overall = Number(scores?.overall) || 0
  if (overall >= 85) return 'strong_hire'
  if (overall >= 70) return 'hire'
  if (overall >= 55) return 'maybe'
  return 'no_hire'
}

export async function onInterviewComplete({ sessionId, scores = null, reason = 'completed' }) {
  if (!sessionId) return null
  const interview = await localDataService.get('interviews', sessionId, 'session_id')
  if (!interview) return null

  const cfg = getAutopilotConfig()
  const candidateId = interview.candidateId
  const candidate = candidateId ? await localDataService.get('candidates', candidateId) : null
  const job = interview.jobId ? await localDataService.get('jobs', interview.jobId) : null
  const applicationId = interview.applicationId

  const decision = decisionFromScores(scores)

  // Persist scores + verdict on the interview record.
  await localDataService.update('interviews', interview.id, {
    status: 'complete',
    score: scores?.overall ?? interview.score ?? null,
    scores: scores || interview.scores || null,
    ai_summary: scores?.summary || null,
    ai_recommendation: decision,
    endReason: reason,
  })

  if (candidateId) {
    await pushTimeline(candidateId, 'interview_live', `Interview ${reason === 'completed' ? 'completed' : `ended (${reason})`}`)
    await pushTimeline(candidateId, 'hr_analysis', `HR analysis: ${decision.replace('_', ' ')} (overall ${scores?.overall ?? '—'})`)
  }
  await logActivity('interview', interview.id, 'completed', `${interview.candidate} interview ${reason} — ${decision}`)

  const offerDecision = decision === 'strong_hire' || decision === 'hire'

  if (offerDecision && candidate && job) {
    return await makeOffer({ candidate, job, applicationId, cfg, decision })
  }

  if (decision === 'no_hire' && candidate && job) {
    await emailService.sendRejectionEmail(candidate.email, candidate.name, job.title)
    await localDataService.update('candidates', candidateId, { stage: 'Rejected' })
    if (applicationId) await localDataService.update('applications', applicationId, { stage: 'Rejected', status: 'Closed' })
    await pushTimeline(candidateId, 'rejected', 'Post-interview: not selected — decline email sent')
    return { decision, offered: false }
  }

  // "maybe" → leave for a human; create a review task.
  if (candidate && job) {
    await localDataService.create('tasks', {
      title: `Review interview: ${candidate.name} — ${job.title}`,
      type: 'task', priority: 'high', related: job.title,
    })
    if (candidateId) await localDataService.update('candidates', candidateId, { stage: 'Interview Review' })
  }
  return { decision, offered: false }
}

async function makeOffer({ candidate, job, applicationId, cfg, decision }) {
  const start = new Date()
  start.setDate(start.getDate() + 21)
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const salary = formatSalary(job)

  const offer = await localDataService.create('offers', {
    candidate: candidate.name,
    candidateId: candidate.id,
    email: candidate.email,
    role: job.title,
    department: job.department,
    salary,
    startDate: startLabel,
    status: cfg.autoSendOffer ? 'sent' : 'draft',
    sentDate: cfg.autoSendOffer ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    approver: job.hiringManager || 'Hiring Manager',
    decision,
  })

  if (cfg.autoSendOffer) {
    // Use the detailed offer letter for auto-send
    await emailService.sendDetailedOfferLetter(candidate.email, candidate.name, {
      jobTitle: job.title,
      department: job.department,
      salary,
      startDate: startLabel,
      hiringManager: job.hiringManager,
    })
  } else {
    await localDataService.create('tasks', {
      title: `Approve & send offer: ${candidate.name} — ${job.title}`,
      type: 'task', priority: 'urgent', related: job.title,
    })
    toast('📝 Offer drafted — awaiting HR approval', { icon: '🎉' })
  }

  await localDataService.update('candidates', candidate.id, { stage: 'Offer' })
  if (applicationId) await localDataService.update('applications', applicationId, { stage: 'Offer', status: 'Offered' })
  await pushTimeline(candidate.id, 'offer', cfg.autoSendOffer ? `Offer sent — ${salary}` : `Offer drafted (${salary}) — awaiting approval`)
  await logActivity('offer', offer.id, cfg.autoSendOffer ? 'sent' : 'drafted', `Offer ${cfg.autoSendOffer ? 'sent to' : 'drafted for'} ${candidate.name}`)
  return { decision, offered: true, offer }
}

// ============================================================
// 4. Full-Auto Pipeline — one-click: shortlist → interviews → offers
// ============================================================

/**
 * Run the FULL hiring pipeline for a job in one shot:
 *  1. Rank & shortlist all candidates (AI scores + Top-N cut)
 *  2. Auto-approve the top N recommended
 *  3. Schedule AI interviews for every approved candidate
 *  4. Post-interview → offer/rejection is handled automatically by onInterviewComplete
 *
 * @param {string} jobId
 * @param {object} opts
 * @param {function} opts.onProgress — called with { stage, message, progress } for UI updates
 * @returns {Promise<{ shortlistResult, approvedCount, scheduledInterviews }>}
 */
export async function runFullAutoPipeline(jobId, { onProgress } = {}) {
  const report = (stage, message, progress) => onProgress?.({ stage, message, progress })

  const job = await localDataService.get('jobs', jobId)
  if (!job) { toast.error('Job not found'); return null }

  // Enable auto-send for this pipeline run.
  const cfg = getAutopilotConfig()

  // ── Stage 1: Rank & shortlist ──
  report('shortlisting', `Ranking applicants for ${job.title}…`, 10)
  const { rankAndShortlist } = await import('./shortlist')
  const shortlistResult = await rankAndShortlist({ jobId })
  if (!shortlistResult) { toast.error('No candidates to rank'); return null }
  report('shortlisting', `Ranked ${shortlistResult.counts.total} candidates — ${shortlistResult.counts.recommended} recommended`, 30)

  // ── Stage 2: Auto-approve top N ──
  report('approving', `Auto-approving top ${shortlistResult.counts.recommended} candidates…`, 40)
  let approvedCount = 0
  for (const candidate of shortlistResult.recommended) {
    if (candidate.shortlistDecision === 'approved') continue // already approved
    await localDataService.update('candidates', candidate.id, {
      stage: 'Shortlisted',
      shortlistDecision: 'approved',
    })
    approvedCount++
  }
  report('approving', `${approvedCount} candidates approved`, 50)

  // Send rejection emails to non-selected candidates.
  if (cfg.autoReject) {
    const rejectees = [...(shortlistResult.belowLine || []), ...(shortlistResult.knockouts || [])]
    for (const c of rejectees) {
      if (c.email) {
        await emailService.sendRejectionEmail(c.email, c.name, job.title)
      }
      await localDataService.update('candidates', c.id, { stage: 'Rejected' })
    }
    report('rejecting', `Sent decline emails to ${rejectees.length} candidates`, 55)
  }

  // ── Stage 3: Schedule AI interviews for all approved ──
  report('scheduling', 'Scheduling AI interviews…', 60)
  const scheduledInterviews = []
  const approved = shortlistResult.recommended
  for (let i = 0; i < approved.length; i++) {
    const candidate = approved[i]
    const freshCandidate = await localDataService.get('candidates', candidate.id) || candidate
    // Schedule interview 1-3 days out (staggered so they don't all overlap)
    const daysFromNow = 1 + Math.floor(i / 3)
    try {
      const interview = await scheduleAutoInterview({
        candidate: freshCandidate,
        job,
        daysFromNow,
      })
      scheduledInterviews.push(interview)

      // Send the professional interview invitation email
      const link = interview.interview_link
      await emailService.sendFullInterviewInvite(
        freshCandidate.email, freshCandidate.name, job.title,
        {
          dateStr: interview.date,
          timeStr: interview.time,
          durationMin: job.interviewDuration || 30,
          link,
          interviewType: 'AI Interview',
        }
      )
    } catch (err) {
      console.error(`Failed to schedule interview for ${candidate.name}:`, err)
    }
    report('scheduling', `Scheduled ${i + 1}/${approved.length} interviews`, 60 + (30 * (i + 1) / approved.length))
  }

  report('complete', `Pipeline complete: ${approvedCount} approved, ${scheduledInterviews.length} interviews scheduled`, 100)
  toast.success(`🚀 Full auto: ${approvedCount} approved, ${scheduledInterviews.length} interviews scheduled`)

  await logActivity('pipeline', jobId, 'full_auto', `Full auto pipeline: ${approvedCount} approved, ${scheduledInterviews.length} interviews for ${job.title}`)

  return { shortlistResult, approvedCount, scheduledInterviews }
}

// ============================================================
// 5. Notify HR when an interview completes (called from CandidateInterview)
// ============================================================
export async function notifyHROnInterviewComplete({ sessionId, candidateName, jobTitle, score, recommendation } = {}) {
  // Get the hiring manager / recruiter email from the job
  const interview = sessionId ? await localDataService.get('interviews', sessionId, 'session_id') : null
  const job = interview?.jobId ? await localDataService.get('jobs', interview.jobId) : null
  const hrEmail = job?.recruiterEmail || 'hr@company.com'
  const hrName = job?.hiringManager || job?.recruiter || 'Hiring Team'

  await emailService.sendInterviewCompletionToHR(hrEmail, hrName, {
    candidateName, jobTitle, score, recommendation, sessionId,
  })
}

export const pipelineService = {
  runApplicationPipeline,
  scheduleAutoInterview,
  checkDueReminders,
  onInterviewComplete,
  getAutopilotConfig,
  setAutopilotConfig,
  runFullAutoPipeline,
  notifyHROnInterviewComplete,
}

