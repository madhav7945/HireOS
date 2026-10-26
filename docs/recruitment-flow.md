# HireOS — End-to-End AI Recruitment Flow

The complete journey a candidate takes through HireOS: **apply → AI score →
shortlist → auto-schedule → AI interview → result → offer/decline** — benchmarked
against how leading AI interview platforms (HireVue, Micro1, HeyMilo) structure
the same funnel, with a clear map of what HireOS already does vs. what's still
missing.

> **The big picture:** HireOS is a "hiring autopilot." A candidate applies on a
> public job page; an AI scores and shortlists them; shortlisted candidates are
> automatically scheduled and emailed a live AI-interview link; the AI conducts a
> 3-phase voice interview; the result flows back into the pipeline and auto-drafts
> an offer or decline. About **80% of this chain is wired today** — the broken
> links are called out in §4.

---

## 1. How real AI interview platforms structure the funnel

This is the industry-standard end-to-end flow our design follows:

1. **Apply / ingest** — resumes, cover letters, form answers, LinkedIn enter the system.
2. **Parse** — NLP extracts skills, tenure, titles, education, competency signals
   from unstructured resumes into a scorable, rankable profile.
3. **Screen & rank** — ML models score every candidate against the role's criteria
   using **configurable weights** (recent experience vs. competency vs. availability),
   producing one shortlist instead of a stack of resumes — in minutes, not weeks.
4. **AI interview** — shortlisted candidates take an AI-driven interview. Two styles:
   - *One-way video* (HireVue): record answers to fixed questions, on your own schedule.
   - *Conversational / adaptive* (Micro1 "Zara", HeyMilo): a real-time two-way voice/video
     interview that **adapts follow-ups** to what you say. If you name a technology, the AI
     drills into it — which also exposes résumé inflation (Micro1 found 21% of candidates
     claimed skills the conversation proved they lacked). **HireOS is this second type.**
5. **Evaluate & score** — responses scored against a **rubric**, with per-question
   rationale, candidate quotes, timestamps, transcripts, and fraud/cheating detection.
6. **Schedule** — passing candidates are auto-scheduled (calendar-synced) for the next
   round, removing email back-and-forth (scheduling is ~38% of a recruiter's week).
7. **Handoff / ATS** — scored results sync back to the ATS; humans make the final call.
   AI is **decision support, not the decision.**

Sources: [HireVue](https://www.hirevue.com/), [HeyMilo — AI Interviews explained](https://www.heymilo.ai/blog/ai-interviews-explained-what-candidates-and-recruiters-need-to-know), [Micro1 AI interviewer](https://www.micro1.ai/ai-interview-guide), [Micro1 research](https://www.micro1.ai/research/quantifying-the-benefits-of-ai-assisted-recruitment), [Recruiterflow — AI screening tools](https://recruiterflow.com/blog/ai-screening-tools/).

---

## 2. The HireOS flow, step by step

```
 ┌───────────┐   ┌───────────┐   ┌────────────┐   ┌───────────┐   ┌────────────┐   ┌──────────┐
 │ 1. APPLY  │──▶│ 2. AI     │──▶│ 3. SHORT-  │──▶│ 4. AUTO-  │──▶│ 5. AI       │──▶│ 6. RESULT│
 │ public    │   │ SCORE     │   │ LIST or    │   │ SCHEDULE  │   │ INTERVIEW   │   │ → OFFER/ │
 │ apply page│   │ (LLM)     │   │ REJECT     │   │ + email   │   │ (3 phases)  │   │ DECLINE  │
 └───────────┘   └───────────┘   └────────────┘   └───────────┘   └────────────┘   └──────────┘
   PublicApply     ai.js          ai.js            pipeline.js      CandidateInterview  pipeline.js
   .jsx            evaluate       shortlist         scheduleAuto     .jsx + interviewAI  onInterview
                   Candidate      decision          Interview                            Complete
```

Orchestrated by **`src/services/pipeline.js`** (the "autopilot"), which is kicked
off from the public apply page and again when an interview ends.

### Step 1 — Apply ✅
- A candidate applies on `src/pages/PublicApplyPage.jsx`. It creates a **candidate**
  (`stage: 'Applied'`, `aiScore: null`) and an **application** (`stage: 'Applied'`,
  `status: 'New'`), then fires `pipelineService.runApplicationPipeline(...)` in the background.

### Step 2 — AI score ✅ (partial: no resume file parsing)
- `ai.js → evaluateCandidate()` calls a Groq/OpenAI-compatible LLM with a prompt
  built from the candidate's skills, cover letter, and experience.
- No API key → `simulateAIEvaluation()` does naive keyword matching against `job.skills`.
- **Limitation:** there's no resume-file ingestion — no `resumeText` is parsed. Scoring
  runs on self-reported `skills` / `coverLetter` only. (Industry step 2 — "parse" — is the gap.)

### Step 3 — Shortlist or reject ✅ (but ignores your job config — see §4)
- Decision is made by the LLM itself returning `action: 'shortlist' | 'reject'`
  (or the simulator's hardcoded `score >= 70`).
- The candidate's `aiScore`, `aiFeedback`, and `stage` are updated; the application
  gets a star rating.

### Step 4 — Auto-schedule + deliver link ✅
- On shortlist, `pipeline.js → scheduleAutoInterview()` (on by default) creates an
  **interview** record linked by `candidateId` / `jobId` / `applicationId`, with
  `status: 'scheduled'` and `scheduledAt` (tomorrow 11:00).
- A unique `session_id` and `interview_link` (`/interview/:sessionId`) are auto-generated.
- Emails go out: *interview scheduled* + *interview link*. Candidate → `Interview Scheduled`,
  application → `Interview`. A reminder task is created.
- **Limitation:** the day-of reminder only fires while the app is open (no backend cron).

### Step 5 — The AI interview ✅
This is the conversational, adaptive interview — the heart of the product. It is
configured per job and runs in three timed phases. **See `docs/ai-interview-flow.md`
for the full detail.** In brief:

| Phase | What happens | Advances at |
|---|---|---|
| **① Intro & Résumé** | Greets by name, sets agenda, deep-dives résumé + job skills | 25% of duration |
| **② Coding** | `numCodingQuestions` coding tasks in a live editor; probes approach, complexity, edge cases, watches Run results | 80% of duration |
| **③ Q&A & Wrap-up** | Candidate's questions, then closes | end |

Runs as a **real two-way voice interview** (TTS out, Whisper STT in), with **live
proctoring** (tab/paste detection + camera CV for phones/multiple people) and **live
scoring** — matching the adaptive, proctored, rubric-scored model of Micro1/HeyMilo.

### Step 6 — Result back to pipeline ✅
- When the interview ends, `CandidateInterview.jsx` calls
  `pipelineService.onInterviewComplete({ sessionId, scores, reason })`.
- `pipeline.js` persists the scores/verdict, maps a decision, and then:
  - **hire / strong_hire →** auto-drafts an offer (auto-send is off by default → HR approves),
  - **no_hire →** auto-declines,
  - **maybe →** creates a human-review task.

This is the "AI is decision-support, not the decision" handoff (industry step 7).

---

## 3. Side-by-side: HireOS vs. the industry standard

| Funnel step | Industry standard | HireOS today |
|---|---|---|
| 1. Apply / ingest | Resume, cover letter, profile | ✅ Public apply page → candidate + application |
| 2. Parse resume | NLP extracts skills/tenure/education | ⚠️ **No file parsing** — uses self-reported skills only |
| 3. Score & rank by weighted rubric | Configurable weights per role | ⚠️ LLM decides; **job weights/thresholds ignored** |
| 4. AI interview (adaptive) | Two-way adaptive voice/video | ✅ 3-phase adaptive voice interview |
| 5. Rubric scoring + rationale + quotes | Per-question scores w/ timestamps | ⚠️ Overall scores only — **no per-question rubric/quotes** |
| 6. Fraud / cheating detection | Proctoring + trust score | ✅ CV + browser proctoring + integrity score |
| 7. Auto-schedule next round | Calendar-synced | ✅ Auto-schedule + emailed link (reminder needs app open) |
| 8. ATS handoff, human final call | Sync to ATS | ✅ Result → pipeline → drafts offer/decline for HR |

---

## 4. Broken links to fix (to make the flow truly "great")

These are the concrete gaps between the flow above and a best-in-class platform,
in priority order:

1. **Wire the job's scoring config into shortlisting.** `shortlistThreshold`,
   `autoRejectBelow`, and the `weight*` sliders are collected in the job wizard
   (Step 3) but **never read** by `ai.js`. Today the LLM's own `action` (or a
   hardcoded `>=70`) decides. Fix: compute a weighted score from the job's weights
   and apply the job's threshold/auto-reject — so the config you set actually drives
   the decision (the industry's "configurable weighting" in step 3).
2. **Add resume ingestion + parsing.** There's no `resumeText` on the candidate
   model. Add resume upload on the apply page, parse it (PDF→text + LLM extract),
   store `resumeText`, and feed it to both scoring and the interviewer (which already
   *expects* `resumeContext`).
3. **Connect the AI Shortlist page to real data.** `AIShortlistPage.jsx` is currently
   **100% static mock data**; its score bars and approve/reject buttons are no-ops.
   Point it at real scored candidates and make override actions move pipeline stages.
4. **Per-question rubric scoring with rationale + quotes.** Today only overall scores
   are produced. Best-in-class platforms attach per-question scores, AI rationale, and
   timestamped candidate quotes. Extend `scoreInterview()` to emit a rubric breakdown.
5. **Drive the interview's coding questions from `numCodingQuestions`.** The live
   editor uses a fixed mock question set; wire the job's count (and ideally a
   role-specific question bank) into it.
6. **Reliable scheduling/reminders.** Replace the app-open-only reminder with a real
   scheduled job, and (industry step 6) offer calendar sync.
7. **Unify the two data layers.** There are parallel Supabase CRUD services and a
   `localData`/`pipeline` engine, with interview-scheduling logic duplicated in both.
   Consolidate so there's one source of truth.

---

## 5. Key files

| Concern | File |
|---|---|
| Public application intake | `src/pages/PublicApplyPage.jsx` |
| Pipeline orchestrator (autopilot) | `src/services/pipeline.js` |
| AI scoring / shortlisting | `src/services/ai.js` |
| Job AI-interview + scoring config | `src/components/job-wizard/StepScreening.jsx` |
| AI Shortlist review page *(static mock today)* | `src/pages/AIShortlistPage.jsx` |
| Live AI interview room | `src/pages/CandidateInterview.jsx` |
| LLM interviewer + interview scoring | `src/services/interviewAI.js` |
| Interview session state | `src/store/interviewSessionStore.js` |
| Data layer (collections) | `src/services/localData.js` |
| Interview flow deep-dive | `docs/ai-interview-flow.md` |
