// ============================================================
// Batch rank + Top-N shortlisting — the big-tech ATS method.
//
// Per-candidate scoring (ai.js) answers "is this person good for the job?".
// This service answers "who are the BEST relative to each other, and where is the
// line?" — the part that makes recruiter workload fixed (top N) regardless of how
// many people apply.
//
// Funnel:
//   all applicants for a job
//     → [1] KNOCKOUT filter (hard, deterministic — applyKnockouts)
//     → [2] AI fit score for every survivor (reuse stored aiScore, or score now)
//     → [3] RANK survivors against each other (score desc, tie-break technical→exp)
//     → [4] mark TOP N "recommended" (score floor as a secondary drop)
//     → [5] persist rank + decision + reasons — DO NOT auto-schedule.
//
// AI recommends; a human confirms each "recommended" candidate on the AI
// Shortlisting page, which is what actually advances them + schedules interviews.
// ============================================================
import { localDataService } from './localData'
import { aiService, applyKnockouts } from './ai'

// Decision buckets stored on each candidate as `shortlistDecision`.
export const SHORTLIST_DECISION = {
  RECOMMENDED: 'recommended', // top N, above the floor — AI recommends advancing
  BELOW_LINE: 'below_line',   // scored + ranked but below the top-N cut (or floor)
  KNOCKOUT: 'knockout',       // failed a hard requirement — never scored
}

// Resolve every candidate that applied to a job. Primary link is the stable
// `jobId` we now persist at apply time; we fall back to matching on the applied
// title for any legacy records created before that fix.
export async function listCandidatesForJob(jobId, job = null) {
  const all = await localDataService.list('candidates')
  const title = (job?.title || '').trim().toLowerCase()
  return all.filter((c) => {
    if (c.jobId && String(c.jobId) === String(jobId)) return true
    if (title && (c.appliedFor || '').trim().toLowerCase() === title) return true
    return false
  })
}

// Ensure a candidate has an AI fit score. Reuse the stored one when present (fast,
// stable re-ranks); otherwise score now via the same evaluateCandidate the
// apply-time pipeline uses, and persist it so the next rank is instant.
async function ensureScored(candidate, job) {
  if (Number.isFinite(Number(candidate.aiScore)) && candidate.aiBreakdown) {
    return candidate
  }
  const evaluation = await aiService.evaluateCandidate(candidate, job)
  const patch = {
    aiScore: evaluation.score,
    aiFeedback: evaluation.recommendation,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    aiBreakdown: evaluation.breakdown || null,
    matchedSkills: evaluation.matchedSkills || [],
    missingSkills: evaluation.missingSkills || [],
  }
  await localDataService.update('candidates', candidate.id, patch)
  return { ...candidate, ...patch }
}

// Stable ranking comparator: overall score desc, then technical, then experience.
function byRank(a, b) {
  const sa = num(a.aiScore), sb = num(b.aiScore)
  if (sb !== sa) return sb - sa
  const ta = num(a.aiBreakdown?.technical), tb = num(b.aiBreakdown?.technical)
  if (tb !== ta) return tb - ta
  return num(b.experience) - num(a.experience)
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Rank an entire applicant pool and mark the top N as recommended.
 *
 * @param {object}  opts
 * @param {string}  opts.jobId
 * @param {number} [opts.topN]        size of the shortlist (defaults to job.shortlistSize || 25)
 * @param {number} [opts.scoreFloor]  secondary guardrail; a recommended candidate must also clear this
 * @returns {Promise<{job, topN, scoreFloor, recommended, belowLine, knockouts, ranked}>}
 */
export async function rankAndShortlist({ jobId, topN, scoreFloor } = {}) {
  const job = await localDataService.get('jobs', jobId)
  if (!job) return null

  const cap = Number.isFinite(Number(topN)) ? Number(topN) : num(job.shortlistSize) || 25
  const floor = Number.isFinite(Number(scoreFloor))
    ? Number(scoreFloor)
    : num(job.shortlistScoreFloor)

  const candidates = await listCandidatesForJob(jobId, job)

  // [1] Knockouts first — never scored, removed from the ranked pool.
  const survivors = []
  const knockouts = []
  for (const c of candidates) {
    const ko = applyKnockouts(c, job)
    if (ko.passed) survivors.push(c)
    else knockouts.push({ ...c, knockoutReasons: ko.reasons })
  }

  // [2] Ensure every survivor has a fit score (reuse or compute).
  const scored = []
  for (const c of survivors) {
    scored.push(await ensureScored(c, job))
  }

  // [3] Rank survivors against each other.
  scored.sort(byRank)

  // [4] Mark the top N (above the floor) recommended; the rest below the line.
  const recommended = []
  const belowLine = []
  scored.forEach((c, i) => {
    const rank = i + 1
    const within = rank <= cap
    const clearsFloor = !floor || num(c.aiScore) >= floor
    const decision = within && clearsFloor ? SHORTLIST_DECISION.RECOMMENDED : SHORTLIST_DECISION.BELOW_LINE
    c.rank = rank
    c.shortlistDecision = decision
    if (decision === SHORTLIST_DECISION.RECOMMENDED) recommended.push(c)
    else belowLine.push(c)
  })

  // [5] Persist rank + decision + reasons. DO NOT auto-schedule — that waits for
  // the human confirm on the AI Shortlisting page.
  await Promise.all([
    ...scored.map((c) =>
      localDataService.update('candidates', c.id, {
        rank: c.rank,
        shortlistDecision: c.shortlistDecision,
        shortlistFloor: floor || null,
        shortlistTopN: cap,
        rankedAt: new Date().toISOString(),
      })
    ),
    ...knockouts.map((c) =>
      localDataService.update('candidates', c.id, {
        rank: null,
        shortlistDecision: SHORTLIST_DECISION.KNOCKOUT,
        knockoutReasons: c.knockoutReasons,
        rankedAt: new Date().toISOString(),
      })
    ),
  ])

  return {
    job,
    topN: cap,
    scoreFloor: floor || 0,
    recommended,
    belowLine,
    knockouts,
    ranked: scored,
    counts: {
      total: candidates.length,
      survivors: scored.length,
      knockouts: knockouts.length,
      recommended: recommended.length,
      belowLine: belowLine.length,
    },
  }
}

export const shortlistService = {
  rankAndShortlist,
  listCandidatesForJob,
  SHORTLIST_DECISION,
}
