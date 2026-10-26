# AI Interview Flow

How HireOS takes a candidate through a fully automated, voice-based AI interview —
from the settings you choose when posting a job, to the live timed interview, to
scoring and the auto-drafted offer.

> TL;DR: You configure the interview once on the **job opening** (duration,
> difficulty, style, language, persona, number of coding questions). When a
> candidate joins, those settings drive a real LLM interviewer that runs three
> timed phases (Intro → Coding → Q&A), proctors the session, scores it, and hands
> off to the hiring pipeline.

---

## 1. Where you configure it — the Job Wizard

When you create a job opening, **Step 3 — Screening Configuration**
(`src/components/job-wizard/StepScreening.jsx`) contains an **"AI Interview
Settings"** section. Each control is saved on the job record:

| Setting | Job field | Options | What it controls |
|---|---|---|---|
| **Duration** | `interviewDuration` | 15 / 20 / 25 / 30 / 45 / 60 min | Total interview length; also paces the phases. |
| **Language** | `interviewLanguage` | English, Hindi, Arabic, French, Spanish, Tamil, Telugu, Bengali | Language the AI speaks if the candidate does. |
| **AI Persona** | `aiPersona` | Aria (Professional) / Max (Casual) / Custom | Interviewer personality. *(collected; see Gaps)* |
| **Difficulty** | `interviewDifficulty` | Adaptive / Easy / Medium / Hard | Question difficulty. Adaptive calibrates from the résumé. |
| **Interview Style** | `interviewStyle` | Friendly / Balanced / Strict | How tough/encouraging the interviewer is. |
| **Coding Questions** | `numCodingQuestions` | 1 / 2 / 3 | How many coding rounds in Phase 2. |

The same step also configures **AI scoring**: shortlist threshold (auto-advance),
auto-reject floor, and the score-weight sliders (Technical / Experience /
Screening / Education / Communication).

---

## 2. How the settings reach the live interview

A candidate opens the interview at `/interview/:sessionId`, rendered by
`src/pages/CandidateInterview.jsx`.

On mount, its init effect:

1. Loads the scheduled interview record by `session_id`.
2. Finds the linked **job** (by `jobId`, falling back to a title match) and reads
   its AI interview settings.
3. Finds the **candidate** record and pulls their résumé / cover letter.
4. Calls `store.initSession()` with:
   - `durationMinutes` ← `job.interviewDuration` (falls back to the scheduled
     `duration_minutes`, then 30).
   - `aiSettings` ← `{ persona, difficulty, style, language, numCodingQuestions }`.
   - `resumeContext` ← the candidate's résumé summary ("the AI has already read this").
   - `jobContext` ← role, department, skills, and a description excerpt.

All of this lives in the **interview session store**
(`src/store/interviewSessionStore.js`), which also syncs state across tabs
(BroadcastChannel) and machines (Supabase Realtime) so an HR observer can watch live.

---

## 3. The live interview — three timed phases

The interviewer is a real LLM (`src/services/interviewAI.js`, OpenAI-compatible —
Groq by default). It follows a strict phase playbook, paced against the configured
duration.

```
        Phase 1                    Phase 2                    Phase 3
   ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
   │ Intro & Résumé   │ ───▶ │ Coding rounds    │ ───▶ │ Q&A & wrap-up    │
   │ greet, agenda,   │      │ N coding tasks   │      │ candidate's Qs,  │
   │ résumé deep-dive │      │ in live editor   │      │ then close       │
   └──────────────────┘      └──────────────────┘      └──────────────────┘
        ▲ 0%                      ▲ 25%                     ▲ 80%      100% ─▶ end
```

| Phase | What the AI does | Advances at |
|---|---|---|
| **① Intro & Résumé** | Greets by name, states the role, sets the agenda, then deep-dives the candidate's résumé and the job's required skills. **No coding yet.** | **25%** of duration → emits `[[PHASE:2]]` |
| **② Coding** | Stops résumé talk. Gives `numCodingQuestions` coding/debugging tasks in the live editor. Asks for approach + complexity *before* coding, watches the editor and Run results, probes edge cases. | **80%** of duration → emits `[[PHASE:3]]` |
| **③ Q&A & Wrap-up** | Stops technical questioning. Asks "Do you have any questions for me?", answers briefly, thanks the candidate, then emits `[[END:completed]]`. | ends |

**Timing example (30-min interview):** ~7.5 min intro → ~16 min coding → ~6 min Q&A.

Phase pacing is automatic (`CandidateInterview.jsx`, "Phase pacing" effect): the
page advances the phase by elapsed time, and the AI can also advance itself early
via the `[[PHASE:n]]` control token.

### Time discipline
- At the exact duration limit, a system note tells the AI to wrap up.
- There's a **~10-minute grace window** for the candidate to finish a thought.
- Past the grace window it **hard-stops** and auto-ends with reason `time`
  (`CandidateInterview.jsx`, "Duration" effect).

### Control tokens (the AI's "powers")
The interviewer can prefix a reply with one silent control token, parsed and
stripped by the UI (`parseInterviewerReply`):

- `[[PHASE:n]]` — advance to phase *n* (forward only).
- `[[WARN]]` — record a formal integrity/conduct warning.
- `[[END:reason]]` — end now. `reason` ∈ `completed | integrity | unresponsive | misconduct | time`.

---

## 4. Voice, proctoring, and scoring

**Voice (real two-way):**
- The AI **speaks** via browser TTS, streamed sentence-by-sentence for low latency.
- It **hears** the candidate via Groq **Whisper** STT (records mic with voice-activity
  detection), with the browser's `SpeechRecognition` as a fallback.
- Turn-taking: the mic is paused while the AI speaks so it never transcribes itself.

**Proctoring** (`useProctoring` + `faceProctor`):
- Browser signals: tab switches, pastes, fullscreen exits, devtools.
- Camera CV (TF.js COCO-SSD): multiple people, phone in frame, candidate absent.
- Serious events bump a weighted **integrity score** and the AI calls them out
  verbally; repeated/egregious events can end the interview.
- An **inactivity watcher** escalates silence: nudge → formal warning → auto-end
  (`unresponsive`).

**Scoring** (`scoreInterview`):
- Once there's enough conversation, the transcript + final code are scored into
  codeQuality / communication / problemSolving / confidence / overall, plus a
  recommendation (`strong_hire | hire | maybe | no_hire`).
- On completion, `finishInterview()` hands off to `pipelineService.onInterviewComplete()`
  — persists scores, runs HR analysis, and auto-drafts an offer or decline.

**AI vs Demo mode:** all of the above requires `VITE_AI_API_KEY` in `.env`
(Groq/OpenAI/OpenRouter compatible). Without a key, the room runs in **Demo Mode**
with canned replies and a placeholder score.

---

## 5. End-to-end summary

```
Create Job (Step 3: AI Interview Settings)
        │  duration, difficulty, style, language, persona, # coding Qs
        ▼
Schedule interview for candidate ──▶ candidate opens /interview/:sessionId
        │
        ▼
initSession() loads job settings + résumé + job context into the store
        │
        ▼
Lobby (camera/mic preview) ──▶ "Join now" (unlocks audio) ──▶ Live
        │
        ▼
Phase 1 Intro/Résumé ─25%─▶ Phase 2 Coding ─80%─▶ Phase 3 Q&A ──▶ End
        │  (voice, proctoring, and live scoring run throughout)
        ▼
finishInterview() ──▶ pipelineService ──▶ scores saved, offer/decline drafted
```

---

## 6. Resolved gaps / future work

Previously these job settings weren't fully wired into the live room. All three are
now closed:

1. ~~**`numCodingQuestions` doesn't pick the editor's questions.**~~ **Done.** The
   live room calls `generateCodingQuestions()` (`src/services/interviewAI.js`) with
   the role, JD, résumé, difficulty and `numCodingQuestions`, validates each via
   `normalizeQuestion()`, and replaces the editor set through `store.setQuestions()`.
   Falls back to `AI_INTERVIEW_QUESTIONS` if AI is unconfigured or generation fails.
2. ~~**`aiPersona` (Aria/Max/Custom) is unused in the prompt.**~~ **Done.** Persona is
   passed into the interviewer system prompt alongside style/difficulty/language.
3. ~~**Phase split is fixed at 25% / 80%.**~~ **Done.** HR picks a pacing preset in the
   Job Wizard (Screening step) which writes `phase2At` / `phase3At` (fractions of the
   duration). The room reads them in the phase-pacing effect, defaulting to 0.25 / 0.80.

### Remaining / future work

- **Multi-language execution** runs JavaScript locally (Web Worker) and Python/Java
  remotely via Piston, graded identically. Other languages run but aren't auto-graded.
- **CV proctoring is advisory.** Signals (no-face / multiple people / phone) are
  temporally debounced to cut false alarms; flags inform the HR review, they don't
  auto-reject.

---

### Key files

| Concern | File |
|---|---|
| Job AI-interview settings UI | `src/components/job-wizard/StepScreening.jsx` |
| Live candidate interview page | `src/pages/CandidateInterview.jsx` |
| LLM interviewer + scoring | `src/services/interviewAI.js` |
| Session state machine | `src/store/interviewSessionStore.js` |
| Browser proctoring | `src/hooks/useProctoring.js` |
| Camera CV proctoring | `src/utils/faceProctor.js` |
| Code execution sandbox | `src/utils/codeRunner.js` |
| Post-interview pipeline | `src/services/pipeline.js` |
