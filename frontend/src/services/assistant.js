// ============================================================
// Zoe agent runtime — drives a tool-calling loop against an
// OpenAI-compatible chat API (Groq by default, same keys as the rest of HireOS).
//
//   user message ──▶ model ──▶ (tool_calls?) ──▶ execute tools ──▶ feed results
//                      ▲                                              │
//                      └──────────────── loop until final text ◀──────┘
//
// Public API:
//   isAssistantConfigured() -> boolean
//   runAssistant({ history, userMessage, context, hooks, onStep }) -> { reply, toolRuns }
// ============================================================
import { buildSystemPrompt, buildContextMessage } from './assistantPrompt'
import { TOOL_SCHEMAS, TOOL_NAMES, executeTool } from './assistantTools'

const API_KEY = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_GROQ_API_KEY || ''
const BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1'

// Lead with the model that does RELIABLE native tool-calling. The fast
// llama-3.1-8b-instant tends to "fake" tool calls by printing tags as text
// (so nothing executes) — it's kept only as a rate-limit fallback. Override the
// primary with VITE_AI_MODEL if you want a different lead model.
const PRIMARY_MODEL = import.meta.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'

// On rate-limit OR a malformed tool call, fall back through these (each has its
// own token bucket). Override with VITE_AI_FALLBACK_MODELS="a,b"; empty disables.
const FALLBACK_MODELS = (
  import.meta.env.VITE_AI_FALLBACK_MODELS ?? 'openai/gpt-oss-20b,llama-3.1-8b-instant'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Ordered chain, primary first, no duplicates.
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)]

// The system prompt is static, so build it ONCE. Sending the identical prefix
// every call lets Groq serve it from prompt cache — and cached input tokens do
// NOT count against your tokens-per-minute limit. This is the single biggest
// lever for not hitting the free-tier cap.
const SYSTEM_PROMPT = buildSystemPrompt()

// Cap tool-call rounds so a confused model can't loop forever (but high enough to
// complete genuinely multi-step requests like "create a job AND schedule 2 interviews").
const MAX_TOOL_ROUNDS = 8
// How many prior turns of chat to keep for context (smaller = fewer tokens/request).
const HISTORY_WINDOW = 8
// Max ms we'll wait for any single rate-limited (429) request before retrying.
// Kept small so Zoe pivots to a fallback model fast instead of stalling.
const MAX_BACKOFF_MS = 3500
// How many times we'll wait-and-retry a 429 on ONE model before moving to the
// next model. 1 = a single quick wait, then pivot — favors speed.
const MAX_RATE_RETRIES = 1

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A rate-limit error we can detect and message nicely.
class RateLimitError extends Error {
  constructor(retryMs) {
    super('rate_limited')
    this.name = 'RateLimitError'
    this.retryMs = retryMs
  }
}

// Groq returns HTTP 400 "Failed to call a function" when the model emits a
// malformed tool call. It's a transient generation glitch — a re-roll or a
// different model usually fixes it. We treat it as retryable, not fatal.
class FunctionCallError extends Error {
  constructor(detail) {
    super('function_call_failed')
    this.name = 'FunctionCallError'
    this.detail = detail
  }
}

export const isFunctionCallFailure = (status, body) =>
  status === 400 && /failed to call a function|failed_generation|tool[_\s]?call/i.test(body || '')

export { RateLimitError, FunctionCallError, MODEL_CHAIN }

// SAFETY NET: weaker models sometimes "fake" tool calls by printing tags in the
// text instead of using the real tool_calls field — e.g.
//   <createJob>{"title":"X"}</createJob>   or   <navigate>{"path":"pipeline"}</navigate>
// (also seen as ```json {"name":"createJob","arguments":{...}} ```). When the
// model does that, nothing executes. This extracts those into real calls so the
// action still runs. Returns [{ name, args }].
const NON_TOOL_TAGS = new Set([
  'thinking', 'thought', 'system', 'user', 'assistant', 'prompt',
  'response', 'code', 'markdown', 'json', 'html', 'xml', 'style', 'script',
])

export function extractTextToolCalls(content, toolNames = TOOL_NAMES) {
  if (!content) return []
  const calls = []

  // 1. <toolName>{...json...}</toolName>
  const tagRe = /<([a-zA-Z][a-zA-Z0-9_]*)>\s*(\{[\s\S]*?\})\s*<\/\1>/g
  let m
  while ((m = tagRe.exec(content))) {
    const tagName = m[1]
    if (NON_TOOL_TAGS.has(tagName.toLowerCase())) continue
    try { calls.push({ name: tagName, args: JSON.parse(m[2]) }) } catch { /* skip bad json */ }
  }

  // 2. Balanced JSON extraction for {"name":"...", "arguments":{...}}
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      let depth = 0
      let inString = false
      let escape = false
      for (let j = i; j < content.length; j++) {
        const char = content[j]
        if (escape) { escape = false; continue }
        if (char === '\\') { escape = true; continue }
        if (char === '"') { inString = !inString; continue }
        if (!inString) {
          if (char === '{') depth++
          else if (char === '}') {
            depth--
            if (depth === 0) {
              const snippet = content.slice(i, j + 1)
              try {
                const obj = JSON.parse(snippet)
                const name = obj.name || obj.tool || obj.function
                if (typeof name === 'string' && name && !NON_TOOL_TAGS.has(name.toLowerCase())) {
                  const args = obj.arguments || obj.parameters || obj.args || {}
                  calls.push({ name, args: typeof args === 'string' ? JSON.parse(args) : args })
                }
              } catch { /* skip */ }
              break
            }
          }
        }
      }
    }
  }

  return calls
}

export function isAssistantConfigured() {
  return !!(API_KEY && !/^your-|placeholder/i.test(API_KEY))
}

// Parse Groq/OpenAI retry hints: Retry-After header (seconds) or "...try again in 2.5s".
export function parseRetryMs(res, body) {
  const header = Number(res.headers.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, MAX_BACKOFF_MS)
  const m = /try again in ([\d.]+)\s*(ms|s)/i.exec(body || '')
  if (m) {
    const v = parseFloat(m[1]) * (m[2].toLowerCase() === 's' ? 1000 : 1)
    return Math.min(v, MAX_BACKOFF_MS)
  }
  return 2000
}

// Single call to ONE model. Handles 429 (wait-and-retry) and the 400
// malformed-tool-call glitch (one re-roll), then throws a typed error so the
// caller can fall back to another model.
async function chat(messages, { model, tools, toolChoice = 'auto', temperature = 0.3, maxTokens = 450 } = {}) {
  let rateAttempts = 0
  let funcAttempts = 0

  while (true) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(tools ? { tools, tool_choice: toolChoice } : {}),
      }),
    })

    if (res.ok) return res.json()

    const detail = await res.text().catch(() => '')

    if (res.status === 429) {
      const retryMs = parseRetryMs(res, detail)
      if (rateAttempts < MAX_RATE_RETRIES && retryMs <= MAX_BACKOFF_MS) {
        rateAttempts++
        await sleep(retryMs)
        continue
      }
      throw new RateLimitError(retryMs)
    }

    if (isFunctionCallFailure(res.status, detail)) {
      if (funcAttempts < 1) {
        funcAttempts++ // re-roll once on the same model (generation is non-deterministic)
        continue
      }
      throw new FunctionCallError(detail)
    }

    throw new Error(`AI request failed: ${res.status}${detail ? ` — ${detail.slice(0, 160)}` : ''}`)
  }
}

// Try each model in the chain. Rate limits and tool-call glitches advance to the
// next (lighter) model; any other error propagates immediately.
export async function chatWithFallback(messages, opts = {}) {
  let lastRetryable = null
  for (const model of MODEL_CHAIN) {
    try {
      return await chat(messages, { ...opts, model })
    } catch (err) {
      if (err instanceof RateLimitError || err instanceof FunctionCallError) {
        lastRetryable = err
        continue // next model
      }
      throw err
    }
  }
  throw lastRetryable || new RateLimitError(2000)
}

/**
 * Run one user turn through Zoe.
 *
 * @param {object}   p
 * @param {Array}    p.history      prior chat as [{role:'user'|'assistant', content}]
 * @param {string}   p.userMessage  the new user message
 * @param {object}   p.context      runtime context for the system prompt (user, path, date)
 * @param {object}   p.hooks        { navigate, invalidate } UI side-effects for tools
 * @param {function} [p.onStep]     optional callback({type:'tool', name, args, result})
 * @returns {Promise<{reply: string, toolRuns: Array}>}
 */
export async function runAssistant({ history = [], userMessage, context = {}, hooks = {}, onStep } = {}) {
  if (!isAssistantConfigured()) {
    return {
      reply:
        "I'm not connected to an AI key yet, so I can't run actions. Add VITE_AI_API_KEY (a free Groq key works) to your .env and restart, and I'll be able to control HireOS for you.",
      toolRuns: [],
    }
  }

  const messages = [
    // Static, cacheable prefix first…
    { role: 'system', content: SYSTEM_PROMPT },
    // …then the tiny volatile context (user, role, screen, date).
    { role: 'system', content: buildContextMessage(context) },
    ...history.slice(-HISTORY_WINDOW).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const toolRuns = []

  const didText = () => {
    const n = toolRuns.length
    return n ? ` I did get ${n} step${n === 1 ? '' : 's'} done first.` : ''
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let data
    try {
      data = await chatWithFallback(messages, { tools: TOOL_SCHEMAS })
    } catch (err) {
      if (err instanceof RateLimitError) {
        const secs = Math.ceil((err.retryMs || 2000) / 1000)
        return {
          reply: `Both the main and fallback models are rate-limited right now (free-tier token cap). Give it about ${secs}s and try again.${didText()}`,
          toolRuns,
        }
      }
      if (err instanceof FunctionCallError) {
        return {
          reply: `I had trouble forming that action cleanly just now — mind rephrasing it a bit more simply?${didText()}`,
          toolRuns,
        }
      }
      return { reply: `I hit an error talking to the AI service: ${err.message}`, toolRuns }
    }

    const choice = data.choices?.[0]
    const msg = choice?.message
    if (!msg) return { reply: "I didn't get a response from the AI service. Try again?", toolRuns }

    const toolCalls = msg.tool_calls || []
    if (toolCalls.length === 0) {
      // SAFETY NET: the model may have "faked" tool calls in plain text instead
      // of using the tool_calls field. Execute those so the action still runs.
      const textCalls = extractTextToolCalls(msg.content)
      if (textCalls.length) {
        // Record what the model said (minus the raw tags) so the thread stays coherent.
        messages.push({ role: 'assistant', content: msg.content || '' })
        for (const { name, args } of textCalls) {
          const result = await executeTool(name, args, hooks)
          toolRuns.push({ name, args, result })
          onStep?.({ type: 'tool', name, args, result })
          messages.push({ role: 'user', content: `(tool ${name} result: ${JSON.stringify(result)})` })
        }
        continue // loop so the model can wrap up in words
      }
      // No more tools requested → this is the final answer.
      const text = (msg.content || '').replace(/<\/?[a-zA-Z][^>]*>/g, '').trim()
      if (text) return { reply: text, toolRuns }
      // Model returned no prose — fall back to the last tool's own message.
      const last = toolRuns[toolRuns.length - 1]?.result?.message
      return { reply: last || 'Done.', toolRuns }
    }

    // Echo the assistant's tool-call message back into the thread.
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls })

    // Execute every requested tool, append its result, then LOOP so the model can
    // chain the next step or wrap up. (We intentionally do NOT return after an
    // action round — that used to cut multi-step tasks short after step one.)
    for (const call of toolCalls) {
      const name = call.function?.name
      let args = {}
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {
        args = {}
      }

      const result = await executeTool(name, args, hooks)
      toolRuns.push({ name, args, result })
      onStep?.({ type: 'tool', name, args, result })

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  // Ran out of rounds — ask the model to wrap up in plain text (no more tools).
  try {
    const finalData = await chatWithFallback(
      [...messages, { role: 'user', content: 'Summarize what you did for me in one or two sentences. Do not call any more tools.' }],
      { temperature: 0.3, maxTokens: 200 },
    )
    const reply = finalData.choices?.[0]?.message?.content?.trim()
    return { reply: reply || 'Done — I completed the steps I could.', toolRuns }
  } catch {
    return { reply: 'Done — I completed several steps. Let me know if you need anything else.', toolRuns }
  }
}

// ============================================================
// Zoe Assist (inline) — one-shot content writer for the job form.
// Unlike runAssistant (the tool-calling operator), this just asks the model to
// WRITE clean HTML for a single field (description / requirements / benefits)
// from the basic job info the user already filled in. No tools, no loop.
// ============================================================

const FIELD_BRIEF = {
  description:
    'Write a compelling, professional JOB DESCRIPTION (an overview of the role, the team, what the person will do, and why it is exciting). 2-4 short paragraphs. Do NOT include a requirements list or a benefits list here.',
  responsibilities:
    'Write the KEY REQUIREMENTS / QUALIFICATIONS for this role as a bulleted list (must-have skills, experience, education). 5-8 concise bullet points.',
  internalNotes:
    'Write an attractive BENEFITS & PERKS section as a bulleted list (compensation perks, growth, culture, work flexibility). 5-7 concise bullet points.',
}

/**
 * Generate HTML content for one job-form field using the job's basic info.
 * @param {('description'|'responsibilities'|'internalNotes')} field
 * @param {object} job  the in-progress job object from the wizard
 * @returns {Promise<{ ok: boolean, html?: string, error?: string }>}
 */
export async function generateJobContent(field, job = {}) {
  if (!isAssistantConfigured()) {
    return { ok: false, error: 'No AI key configured. Add VITE_AI_API_KEY (a free Groq key works) to your .env and restart.' }
  }
  const brief = FIELD_BRIEF[field] || FIELD_BRIEF.description

  const facts = [
    job.title && ('Title: ' + job.title),
    job.department && ('Department: ' + job.department),
    (job.jobType || job.type) && ('Type: ' + (job.jobType || job.type)),
    job.workMode && ('Work mode: ' + job.workMode),
    job.location && ('Location: ' + job.location),
    Array.isArray(job.skills) && job.skills.length && ('Skills: ' + job.skills.join(', ')),
    (job.experienceMin || job.experienceMax) && ('Experience: ' + (job.experienceMin || 0) + '-' + (job.experienceMax || '+') + ' years'),
    job.education && job.education !== 'Any' && ('Education: ' + job.education),
  ].filter(Boolean).join('\n')

  const system =
    'You are Zoe, a recruiting copywriter inside an ATS. You write clean, professional, inclusive job-posting content. ' +
    'Output ONLY valid HTML using paragraph, unordered-list, list-item and strong tags (<p>, <ul>, <li>, <strong>) — no markdown, no code fences, no big headings, no preamble or sign-off. ' +
    'Never invent a salary, company name, or facts not given. Keep it ATS-friendly and concise.'

  const user =
    brief + '\n\nJob details provided by the recruiter:\n' +
    (facts || '(only a title may be set — infer sensible, generic content)') +
    '\n\nReturn just the HTML for this one section.'

  try {
    const data = await chatWithFallback(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.6, maxTokens: 700 },
    )
    let html = data.choices?.[0]?.message?.content?.trim() || ''
    // Strip accidental code fences some models wrap content in.
    html = html.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
    if (!html) return { ok: false, error: 'The AI returned an empty result — try again.' }
    return { ok: true, html }
  } catch (err) {
    if (err instanceof RateLimitError) {
      const secs = Math.ceil((err.retryMs || 2000) / 1000)
      return { ok: false, error: 'AI is rate-limited (free-tier cap). Give it ~' + secs + 's and try again.' }
    }
    return { ok: false, error: err?.message || 'AI request failed.' }
  }
}
