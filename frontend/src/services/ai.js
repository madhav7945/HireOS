import { localDataService } from './localData'
import toast from 'react-hot-toast'

// Real email delivery (Supabase Edge Function + Resend, with honest stub fallback).
// Re-exported here for backwards compatibility with existing imports.
export { emailService } from './email'
import { emailService } from './email'

// AI config — OpenAI-compatible (Groq / OpenAI / OpenRouter). Shared with interviewAI.js.
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_GROQ_API_KEY || ''
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'

export const aiService = {
  /**
   * Evaluates a candidate using Groq AI (if API key is present) or falls back to a simulated AI response.
   */
  evaluateCandidate: async (candidateData, jobData) => {
    const apiKey = AI_API_KEY

    if (!apiKey || /^your-|placeholder/i.test(apiKey)) {
      console.warn("No AI API key found. Simulating AI evaluation.")
      return simulateAIEvaluation(candidateData, jobData)
    }

    try {
      const weights = jobWeights(jobData)
      const resume = candidateData.resumeText
        ? String(candidateData.resumeText).slice(0, 6000)
        : '(no résumé uploaded — score from the profile below only, and note the missing résumé as a weakness)'

      const prompt = `
        You are an expert technical recruiter screening a candidate for "${jobData.title}".
        Score the candidate by COMPARING the résumé and profile against the job requirements.
        Read the actual résumé text — do not trust self-reported skills alone; if the résumé
        does not back up a claimed skill, treat that as résumé inflation and lower the score.

        JOB REQUIREMENTS
        - Department: ${jobData.department}
        - Required Skills: ${(jobData.skills || []).join(', ')}
        - Description: ${String(jobData.description || '').slice(0, 800)}

        SCORING RUBRIC — score EACH dimension 0-100, then combine using these weights
        (set by the hiring team; they sum to 100):
        - technical (${weights.technical}%)
        - experience (${weights.experience}%)
        - screening/cover-letter fit (${weights.screening}%)
        - education (${weights.education}%)
        - communication (${weights.communication}%)

        CANDIDATE PROFILE
        - Name: ${candidateData.name}
        - Stated experience: ${candidateData.experience || '?'} years
        - Current Company: ${candidateData.currentCompany || '—'}
        - Claimed Skills: ${(candidateData.skills || []).join(', ') || '—'}
        - Cover Letter: ${String(candidateData.coverLetter || '—').slice(0, 1200)}

        RÉSUMÉ TEXT
        ${resume}

        Respond ONLY with a JSON object in this exact format, nothing else:
        {
          "breakdown": {
            "technical": <0-100>, "experience": <0-100>, "screening": <0-100>,
            "education": <0-100>, "communication": <0-100>
          },
          "score": <weighted 0-100 overall using the weights above>,
          "matchedSkills": ["skills the résumé genuinely demonstrates"],
          "missingSkills": ["required skills not evidenced in the résumé"],
          "recommendation": "<short 2 sentence explanation grounded in the résumé>",
          "strengths": ["strength 1", "strength 2"],
          "weaknesses": ["weakness 1"]
        }
      `

      const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      })

      if (!response.ok) throw new Error(`AI request failed: ${response.status}`)

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)
      // The threshold/auto-reject DECISION is made from the job config here — not
      // left to the model — so the wizard's sliders actually drive shortlisting.
      return decideAction(result, jobData)

    } catch (error) {
      console.error("AI evaluation error:", error)
      toast.error("AI Evaluation failed, falling back to basic matching.")
      return simulateAIEvaluation(candidateData, jobData)
    }
  },

  /**
   * Process a new application end-to-end through the AI pipeline:
   *   1. Send the candidate a "received" confirmation email.
   *   2. Run AI evaluation.
   *   3. Update the candidate AND the linked application record.
   *   4. If shortlisted, send the shortlist email.
   *
   * @param {string} candidateId
   * @param {string} jobId
   * @param {string} [applicationId] local id of the application record to sync
   * @returns {Promise<{evaluation, shortlisted, confirmationDelivered, shortlistDelivered}>}
   */
  processNewApplication: async (candidateId, jobId, applicationId = null) => {
    const candidate = await localDataService.get('candidates', candidateId)
    const job = await localDataService.get('jobs', jobId)

    if (!candidate || !job) return

    // 1. Confirmation email (matches the "confirmation email sent" promise in the UI).
    const confirmation = await emailService.sendApplicationReceived(candidate.email, candidate.name, job.title)

    toast('AI is analyzing application...', { icon: '🧠' })

    // 2. Evaluate.
    const evaluation = await aiService.evaluateCandidate(candidate, job)
    const shortlisted = evaluation.action === 'shortlist'
    const newStage = shortlisted ? 'Shortlisted' : 'Screening'

    // 3a. Update candidate with AI results.
    await localDataService.update('candidates', candidateId, {
      aiScore: evaluation.score,
      aiFeedback: evaluation.recommendation,
      stage: newStage,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      aiBreakdown: evaluation.breakdown || null,
      matchedSkills: evaluation.matchedSkills || [],
      missingSkills: evaluation.missingSkills || [],
    })

    // 3b. Keep the application record in sync so the Applications board reflects the AI decision.
    if (applicationId) {
      await localDataService.update('applications', applicationId, {
        stage: newStage,
        status: shortlisted ? 'In-Review' : 'New',
        rating: scoreToRating(evaluation.score),
        aiScore: evaluation.score,
      })
    }

    // 4. Shortlist email.
    let shortlist = { delivered: false }
    if (shortlisted) {
      shortlist = await emailService.sendShortlistEmail(candidate.email, candidate.name, job.title)
    }

    return {
      evaluation,
      shortlisted,
      confirmationDelivered: confirmation?.delivered ?? false,
      shortlistDelivered: shortlist?.delivered ?? false,
    }
  }
}

// Read the job's AI score weights (set in the wizard's Step 3). Falls back to a
// sensible default split and renormalizes so the five always sum to 100.
function jobWeights(job) {
  const raw = {
    technical: num(job?.weightTechnical, 30),
    experience: num(job?.weightExperience, 25),
    screening: num(job?.weightScreening, 20),
    education: num(job?.weightEducation, 10),
    communication: num(job?.weightCommunication, 15),
  }
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round((v / total) * 100)]))
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// ============================================================
// KNOCKOUTS — a hard, deterministic pass/fail filter that runs BEFORE AI scoring
// (the big-ATS pattern). Knockouts encode non-negotiable, objective, job-related
// requirements (work authorization, minimum experience, disqualifying screening
// answers). A failed knockout removes the candidate from the ranked pool entirely
// — they are never scored. Kept separate from the weighted fit score so a strong
// résumé can never "score over" a missing hard requirement. Returns reasons for
// auditability (EEOC / NYC LL144).
//
// Built-in gates (driven by fields the apply form already collects):
//   • work authorization  — candidate.workAuth vs job.requireWorkAuth
//   • minimum experience  — candidate.experience vs job.experienceMin
// Plus per-question knockouts from job.screeningQuestions[].autoDisqualify.
// ============================================================
export function applyKnockouts(candidate, job) {
  const reasons = []
  if (!candidate || !job) return { passed: true, reasons }

  // 1. Work authorization (only enforced when the job opts in).
  if (job.requireWorkAuth) {
    const wa = String(candidate.workAuth || '').toLowerCase()
    const authorized = /yes|authoriz|citizen|permanent|no sponsor/.test(wa)
    const needsSponsor = /sponsor|visa required|not authoriz/.test(wa)
    if (!authorized || needsSponsor) reasons.push('Not authorized to work without sponsorship')
  }

  // 2. Minimum experience (hard floor, not a weighted input).
  const minYears = num(job.experienceMin, 0)
  if (minYears > 0) {
    const years = num(candidate.experience, num(candidate.resumeData?.totalExperienceYears, 0))
    if (years < minYears) reasons.push(`Below minimum experience (${years}/${minYears} yrs)`)
  }

  // 3. Per-question disqualifying answers from the screening config.
  const answers = candidate.screeningAnswers || candidate.answers || {}
  for (const q of job.screeningQuestions || []) {
    const dq = String(q.autoDisqualify || '').trim()
    if (!dq) continue
    const ans = answers[q.id] ?? answers[q.text]
    if (ans == null || ans === '') continue
    const a = String(ans).trim().toLowerCase()
    // Numeric "minimum" form, e.g. autoDisqualify="min:3" on a Number question.
    const minMatch = dq.match(/^min:\s*(\d+(?:\.\d+)?)/i)
    if (minMatch) {
      if (num(ans, 0) < Number(minMatch[1])) reasons.push(`"${q.text || 'Screening question'}" below required minimum`)
      continue
    }
    // Otherwise: this exact answer disqualifies (e.g. Yes/No knockout).
    if (a === dq.toLowerCase()) reasons.push(`Disqualifying answer to "${q.text || 'screening question'}"`)
  }

  return { passed: reasons.length === 0, reasons }
}

// Apply the JOB's shortlist threshold + auto-reject floor to a scored result, and
// recompute the weighted overall from the breakdown when present (so the score the
// candidate is judged on is the one the weights produce, not a free-floating number).
// This is what makes the wizard's sliders actually control shortlisting.
function decideAction(result, job) {
  const weights = jobWeights(job)
  const b = result.breakdown
  let score = num(result.score, NaN)
  if (b && typeof b === 'object') {
    const weighted =
      num(b.technical, 0) * weights.technical +
      num(b.experience, 0) * weights.experience +
      num(b.screening, 0) * weights.screening +
      num(b.education, 0) * weights.education +
      num(b.communication, 0) * weights.communication
    score = Math.round(weighted / 100)
  }
  if (!Number.isFinite(score)) score = 0

  const threshold = num(job?.shortlistThreshold, 70)
  const autoRejectOn = job?.autoRejectEnabled !== false
  const rejectBelow = autoRejectOn ? num(job?.autoRejectBelow, 0) : 0

  // Below the auto-reject floor → reject. At/above the shortlist threshold →
  // shortlist. Otherwise not shortlisted (no separate review stage downstream yet).
  let action = 'reject'
  if (score >= threshold) action = 'shortlist'
  else if (score < rejectBelow) action = 'reject'

  return { ...result, score, action, weights, threshold }
}

// Map a 0-100 AI score to a 1-5 star rating for the Applications board.
function scoreToRating(score) {
  const s = Number(score) || 0
  if (s >= 90) return 5
  if (s >= 75) return 4
  if (s >= 60) return 3
  if (s >= 45) return 2
  return 1
}

// Fallback logic if no API key is provided. This still reads the actual résumé
// text (when present) and the job's required skills, builds a per-dimension
// breakdown, and runs it through the SAME decideAction() the real LLM path uses —
// so the job's weights/threshold/auto-reject drive shortlisting either way.
function simulateAIEvaluation(candidate, job) {
  const required = (job.skills || []).map((s) => String(s).toLowerCase()).filter(Boolean)
  const resume = String(candidate.resumeText || '').toLowerCase()
  const profile = [
    (candidate.skills || []).join(' '),
    candidate.coverLetter || '',
    candidate.currentCompany || '',
  ].join(' ').toLowerCase()
  const haystack = `${resume} ${profile}`

  // Which required skills are actually evidenced (résumé preferred over self-report)?
  const matchedSkills = []
  const missingSkills = []
  required.forEach((kw) => {
    if (haystack.includes(kw)) matchedSkills.push(kw)
    else missingSkills.push(kw)
  })
  const matchPct = required.length ? matchedSkills.length / required.length : 0.7

  // Per-dimension scores (0-100), grounded in real signals rather than randomness.
  const years = num(candidate.experience, 0)
  const hasResume = resume.length > 80
  const eduHit = /(b\.?\s?tech|b\.?\s?e\.?|b\.?sc|m\.?tech|m\.?sc|mba|bachelor|master|ph\.?d|degree|university|college)/i.test(
    `${resume} ${profile}`
  )
  const coverLen = String(candidate.coverLetter || '').trim().length

  const breakdown = {
    technical: Math.round(matchPct * 100),
    experience: clamp(Math.round(years * 12) + (hasResume ? 10 : 0)),
    screening: clamp(coverLen > 400 ? 80 : coverLen > 120 ? 60 : coverLen > 0 ? 40 : 20),
    education: eduHit ? 75 : 45,
    communication: clamp(coverLen > 200 ? 70 : 55),
  }

  const niceMatched = matchedSkills.map(titleCase)
  const niceMissing = missingSkills.map(titleCase)

  const result = {
    breakdown,
    score: breakdown.technical, // decideAction recomputes the weighted overall
    matchedSkills: niceMatched,
    missingSkills: niceMissing,
    recommendation: hasResume
      ? `Résumé evidences ${niceMatched.length}/${required.length || '—'} required skills.`
      : 'No résumé on file — scored from the self-reported profile only.',
    strengths: niceMatched.length
      ? [`Demonstrates ${niceMatched.slice(0, 3).join(', ')}`, years ? `${years} yrs experience` : 'Relevant background']
      : ['Relevant industry background'],
    weaknesses: niceMissing.length
      ? [`No evidence of ${niceMissing.slice(0, 3).join(', ')}`]
      : (hasResume ? ['Minor gaps in depth'] : ['No résumé uploaded']),
  }

  return Promise.resolve(decideAction(result, job))
}

// Clamp a number into the 0-100 score range.
function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
}

function titleCase(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================
// ZOE AI ASSISTConcatTransformStream / job description & requirements generator
// Uses the configured LLM (Groq/OpenAI) or falls back to smart templates.
// ============================================================

function zoeFallback(job, type) {
  const { title = '', department = '', skills = [], experienceMin = 0, experienceMax = 5, location = '', workMode = 'On-site' } = job
  const skillsText = skills.join(', ')
  const expText = experienceMin > 0 ? `${experienceMin}-${experienceMax} years` : `${experienceMax} years`

  if (type === 'description') {
    return `We are looking for a talented ${title} to join our ${department} team${location ? ` in ${location}` : ''}. This is a ${workMode.toLowerCase()} position requiring ${expText} of relevant experience.

As a ${title}, you will be responsible for designing, developing, and maintaining high-quality software solutions. You will collaborate with cross-functional teams to deliver impactful products that meet business needs.

Key Responsibilities:
• Design and develop scalable, robust, and maintainable software solutions
• Collaborate with product managers, designers, and other stakeholders
• Write clean, well-documented, and testable code
• Participate in code reviews and provide constructive feedback
• Troubleshoot, debug, and upgrade existing systems
• Stay updated with emerging technologies and industry trends

Required Skills: ${skillsText}

We offer a competitive salary, comprehensive benefits, and a dynamic work environment where you can grow professionally.`
  }

  if (type === 'responsibilities') {
    return `• Design, develop, and maintain high-quality software applications and systems
• Collaborate with cross-functional teams including product, design, and QA
• Write clean, efficient, and well-documented code following best practices
• Conduct code reviews and mentor junior team members
• Troubleshoot and resolve technical issues in a timely manner
• Optimize application performance and ensure scalability
• Stay current with emerging technologies and industry trends
• Participate in agile ceremonies including sprint planning and retrospectives`
  }

  if (type === 'requirements') {
    return `• ${experienceMin > 0 ? `${experienceMin}+ years` : 'Proven'} experience in ${title} or similar roles
• Strong proficiency in ${skillsText || 'relevant technologies'}
• Experience with ${department.toLowerCase()} best practices and workflows
• Excellent problem-solving and analytical skills
• Strong communication and collaboration abilities
• Bachelor's degree in Computer Science or equivalent experience`
  }

  return ''
}

export async function zoeGenerate(job, type = 'description') {
  const apiKey = AI_API_KEY

  if (!apiKey || /^your-|placeholder/i.test(apiKey)) {
    console.warn('[Zoe] No AI API key found. Using fallback template.')
    return zoeFallback(job, type)
  }

  const { title = '', department = '', skills = [], experienceMin = 0, experienceMax = 5, location = '', workMode = 'On-site', description = '' } = job
  const skillsText = skills.join(', ')
  const expText = experienceMin > 0 ? `${experienceMin}-${experienceMax} years` : `${experienceMax} years`

  let prompt = ''
  if (type === 'description') {
    prompt = `Write a highly concise, professional job description for a "${title}" role in the ${department} department.

Context:
- Location: ${location || 'Not specified'}
- Work Mode: ${workMode}
- Experience: ${expText}

Format exactly like this, using Markdown:
**Join our [Department] squad as a [Title] and shape the future of our [relevant industry/domain] ecosystem**

[1 concise paragraph (max 3-4 sentences) introducing the company, the team, and the core purpose of the role. Be punchy and professional.]

**Key responsibilities**

- [4-6 concise bullet points detailing specific technical/professional duties]

**What success looks like**

- [3-4 concise bullet points detailing measurable outcomes and impact]

**Why you’ll love working with us**

[1 concise paragraph (max 3-4 sentences) about culture, work-life balance, and growth. End with a strong call to action.]

IMPORTANT RULES:
- Be extremely concise. Do not use fluff or generic corporate jargon.
- Do NOT output any other text or conversational filler, just the requested markdown.`
  } else if (type === 'responsibilities') {
    prompt = `Write detailed job responsibilities for a "${title}" role in ${department}.

Context:
- Experience Required: ${expText}
- Required Skills: ${skillsText || 'Not specified'}
${description ? `- Job Description: ${description.slice(0, 500)}` : ''}

Provide 6-8 bullet points covering:
1. Core technical duties
2. Collaboration and communication
3. Quality and best practices
4. Mentorship and leadership (if senior)
5. Problem-solving and innovation

Make them specific, actionable, and relevant to the role.`
  } else if (type === 'requirements') {
    prompt = `Write must-have requirements for a "${title}" role in ${department}.

Context:
- Experience Required: ${expText}
- Required Skills: ${skillsText || 'Not specified'}
- Work Mode: ${workMode}

Provide 5-7 bullet point requirements. Each should start with "• " and be a single concise requirement. Focus on:
1. Technical skills and tools
2. Experience level expectations
3. Education/certifications (if relevant)
4. Soft skills and collaboration abilities

Return ONLY the bullet points, without any additional commentary.`
  }

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    })

    if (!response.ok) throw new Error(`Zoe request failed: ${response.status}`)

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('[Zoe] Generation failed:', error)
    toast.error('Zoe AI failed, using fallback template.')
    return zoeFallback(job, type)
  }
}
