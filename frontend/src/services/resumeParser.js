// ============================================================
// Resume Parser — turn an uploaded résumé file into text + structured data.
//
// Two stages, both browser-side:
//   1. EXTRACT TEXT from the uploaded file (PDF / DOCX / TXT). PDF uses pdf.js
//      loaded lazily from a CDN so we add NO new npm dependency. DOCX falls back
//      to a best-effort raw-text scrape; TXT is read directly.
//   2. STRUCTURE the text with the same OpenAI-compatible LLM the rest of the app
//      uses (Groq by default). Falls back to a regex/keyword extractor when no
//      API key is configured, so it always returns something usable.
//
// The result is stored on the candidate as `resumeText` (raw) + `resumeData`
// (structured), which AI shortlisting (ai.js) and the AI interviewer
// (interviewAI.js, via resumeContext) both consume.
// ============================================================

const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_GROQ_API_KEY || ''
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'

const PDFJS_VERSION = '4.7.76'
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`

function isAIConfigured() {
  return !!(AI_API_KEY && !/^your-|placeholder/i.test(AI_API_KEY))
}

// ---- Stage 1: text extraction ----

let pdfjsPromise = null
function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise
  // Dynamic import from CDN — no bundler dependency required.
  pdfjsPromise = import(/* @vite-ignore */ PDFJS_URL).then((pdfjs) => {
    try { pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL } catch (_) {}
    return pdfjs
  })
  return pdfjsPromise
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return text.trim()
}

// DOCX is a zip; without a library we can't unzip in-browser reliably, so we do a
// best-effort scrape of any readable runs of text. Good enough as a fallback —
// candidates overwhelmingly upload PDFs.
async function extractDocxText(file) {
  const raw = await file.text().catch(() => '')
  // Pull out sequences of printable characters (strips the binary zip framing).
  const readable = raw.replace(/[^\x20-\x7E\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return readable.length > 40 ? readable : ''
}

/**
 * Extract plain text from an uploaded résumé File. Returns '' if it can't.
 */
export async function extractResumeText(file) {
  if (!file) return ''
  const name = (file.name || '').toLowerCase()
  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return await extractPdfText(file)
    if (name.endsWith('.txt') || file.type === 'text/plain') return (await file.text()).trim()
    if (name.endsWith('.docx') || name.endsWith('.doc')) return await extractDocxText(file)
    // Unknown type — try reading as text.
    return (await file.text()).trim()
  } catch (err) {
    console.warn('[HireOS] résumé text extraction failed:', err?.message || err)
    return ''
  }
}

// ---- Stage 2: structure the text ----

const EMPTY_RESUME_DATA = {
  skills: [], totalExperienceYears: null, currentTitle: '', currentCompany: '',
  education: '', summary: '', titles: [], companies: [], links: [],
}

/**
 * Turn résumé text into structured fields with the LLM (or a regex fallback).
 * @param {string} text raw résumé text
 * @param {object} [job] optional job for skill-aware extraction
 */
export async function structureResume(text, job = null) {
  const clean = String(text || '').slice(0, 8000).trim()
  if (!clean) return { ...EMPTY_RESUME_DATA }
  if (!isAIConfigured()) return fallbackStructure(clean, job)

  const jobSkills = (job?.skills || []).join(', ')
  const prompt = `You are a résumé parser. Extract structured data from the résumé text below.
${jobSkills ? `The role requires these skills (detect which the candidate genuinely has): ${jobSkills}.` : ''}
Respond ONLY with strict JSON in this exact shape, no prose:
{
  "skills": ["..."],
  "totalExperienceYears": <number>,
  "currentTitle": "...",
  "currentCompany": "...",
  "education": "...",
  "titles": ["..."],
  "companies": ["..."],
  "links": ["..."],
  "summary": "..."
}

RÉSUMÉ TEXT:
${clean}`

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`parse ${res.status}`)
    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)
    return {
      ...EMPTY_RESUME_DATA,
      ...parsed,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      titles: Array.isArray(parsed.titles) ? parsed.titles : [],
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    }
  } catch (err) {
    console.warn('[HireOS] LLM résumé structuring failed, using fallback:', err?.message || err)
    return fallbackStructure(clean, job)
  }
}

// Regex/keyword fallback so parsing works with no API key.
function fallbackStructure(text, job) {
  const lower = text.toLowerCase()
  const COMMON_SKILLS = [
    'javascript', 'typescript', 'react', 'node', 'node.js', 'python', 'java', 'c++', 'c#', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'postgres', 'mongodb', 'redis', 'graphql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'next.js', 'vue', 'angular',
    'django', 'flask', 'spring', 'express', 'tailwind', 'figma', 'css', 'html', 'git',
    'machine learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'data science', 'devops',
  ]
  const jobSkills = (job?.skills || []).map((s) => String(s).toLowerCase())
  const pool = Array.from(new Set([...jobSkills, ...COMMON_SKILLS]))
  const skills = pool.filter((s) => lower.includes(s))

  // Years of experience: look for "X years" / "X+ years".
  const yrMatch = lower.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)/)
  const totalExperienceYears = yrMatch ? Number(yrMatch[1]) : null

  const links = (text.match(/https?:\/\/[^\s)]+/gi) || []).slice(0, 5)
  const eduMatch = text.match(/(b\.?\s?tech|b\.?\s?e\.?|b\.?sc|m\.?tech|m\.?sc|mba|bachelor|master|ph\.?d)[^\n]{0,60}/i)

  return {
    ...EMPTY_RESUME_DATA,
    skills: skills.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())),
    totalExperienceYears,
    education: eduMatch ? eduMatch[0].trim() : '',
    links,
    summary: text.slice(0, 200).replace(/\s+/g, ' ').trim(),
  }
}

/**
 * One-shot: file → { resumeText, resumeData }. Used by the apply page.
 */
export async function parseResumeFile(file, job = null) {
  const resumeText = await extractResumeText(file)
  if (!resumeText) return { resumeText: '', resumeData: { ...EMPTY_RESUME_DATA } }
  const resumeData = await structureResume(resumeText, job)
  return { resumeText, resumeData }
}

export const resumeParser = { extractResumeText, structureResume, parseResumeFile }
