// ============================================================
// Job distribution engine — NO paid APIs / API keys required.
//
// You can't legitimately auto-post into someone's LinkedIn/Naukri feed without
// their paid API + OAuth (and browser-scripting it breaks their ToS and can't
// run from a static site). So instead we make hands-off distribution work the
// realistic, free way, via four "kinds" of channel:
//
//   preview → share a URL; the platform's crawler scrapes our server-rendered
//             Open Graph tags so the post shows a rich job card with the title,
//             description, salary + apply link (LinkedIn, Facebook, Slack…).
//   intent  → open the platform composer pre-filled with text + link, one click
//             to publish (X, WhatsApp, Telegram, Reddit, Email).
//   manual  → board has no public post intent: copy a ready-to-paste post and
//             open that board's "post a job" page (Naukri, Indeed, Reed, UK…).
//   feed    → fully automated, zero clicks: the board ingests our XML feed /
//             JSON-LD (Google for Jobs, Indeed, Adzuna).
//
// The single trick that fixes "nothing shows when I post on LinkedIn": we never
// share the bare SPA link (/apply/:id) — crawlers don't run JS so they see an
// empty page. We share /api/share?... which returns real <meta> tags and then
// redirects humans to the apply page.
//
// THIS FILE IS THE SINGLE SOURCE OF TRUTH for every job board in the app. The
// Distribute panel, the wizard's Publish step, and the Job Boards page all read
// BOARD_REGISTRY (via the exports below). Every board listed here actually does
// something — there are no cosmetic "Connect me" placeholders or fake reach.
// ============================================================

const PRODUCTION_URL = import.meta.env.VITE_PUBLIC_URL || 'https://hireos-pi.vercel.app'

export const REGIONS = [
  { key: 'all', label: 'All' },
  { key: 'global', label: 'Global' },
  { key: 'india', label: 'India' },
]

export const SHARE_KINDS = {
  preview: { label: 'Rich preview', hint: 'Shows a full job card (title, description, apply link)' },
  intent: { label: 'One-click post', hint: 'Opens the composer pre-filled — just hit Post' },
  manual: { label: 'Copy & open board', hint: 'Copies a ready post, then opens the board' },
  feed: { label: 'Automated feed', hint: 'Auto-indexed from our feed / JSON-LD — no posting needed' },
}

export function getBaseUrl() {
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  // localhost links won't resolve for external crawlers, so use the prod URL.
  return isLocal ? PRODUCTION_URL : (typeof window !== 'undefined' ? window.location.origin : PRODUCTION_URL)
}

const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// Turn rich-text HTML (description / requirements / benefits) into readable
// plain-text lines: <li> → "• item", block tags → line breaks, tags stripped,
// entities decoded. This is what makes the pasted post show EVERYTHING the user
// typed in the form — not a one-line truncated blurb.
function htmlToLines(html, { bullet = true } = {}) {
  if (!html) return ''
  let t = String(html)
    .replace(/<\s*(br|\/p|\/div|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, bullet ? '\n• ' : '\n')
    .replace(/<\/\s*li>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
  // collapse runs of blank lines, trim each line, drop empties
  return t
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

export function getApplyUrl(job, base = getBaseUrl()) {
  return `${base}/apply/${job?.id || 'new'}`
}

function salaryStr(job) {
  const min = job?.salaryMin
  const max = job?.salaryMax
  if (min && max) {
    const currency = job?.currency || 'INR'
    const period = job?.salaryPeriod === 'monthly' ? 'mo' : 'yr'
    return `${currency} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}/${period}`
  }
  return job?.salaryRange || ''
}

// The OG share URL — what we actually post to "preview" platforms. The
// serverless /api/share function turns these params into crawler-readable tags.
export function getShareUrl(job, base = getBaseUrl()) {
  const p = new URLSearchParams()
  p.set('id', job?.id || 'new')
  p.set('t', clean(job?.title).slice(0, 120) || 'Open Role')
  p.set('d', clean(job?.description).slice(0, 280))
  p.set('l', clean(job?.location || job?.city) || 'Remote')
  p.set('c', clean(job?.company) || 'HireOS')
  const sal = salaryStr(job)
  if (sal) p.set('s', sal)
  const dept = clean(job?.department)
  if (dept) p.set('dept', dept)
  const type = clean(job?.type || job?.jobType)
  if (type) p.set('jt', type)
  return `${base}/api/share?${p.toString()}`
}

// A rich, ready-to-paste post — capped at ~2600 chars so it fits
// LinkedIn's 3000-char limit (leaves room for hashtags + apply link).
export function buildPostText(job, applyUrl = getApplyUrl(job), { full = false } = {}) {
  const dept = clean(job?.department)
  const sal = salaryStr(job)
  const exp = clean(job?.experience || job?.experienceLevel)
  const skills = Array.isArray(job?.skills) && job.skills.length
    ? `\nSkills: ${job.skills.slice(0, 10).join(', ')}` : ''

  const description = htmlToLines(job?.description, { bullet: false })
  const requirements = htmlToLines(job?.responsibilities)
  const benefits = htmlToLines(job?.benefits || job?.internalNotes)

  const section = (heading, body, maxLen) => {
    if (!body) return ''
    const text = body.length > maxLen ? body.slice(0, maxLen).trim() + '...' : body
    return `\n${heading}\n${text}`
  }

  let post = [
    `We're Hiring: ${clean(job?.title) || 'Open Role'}`,
    dept ? `Company: ${dept}` : '',
    `Location: ${clean(job?.location || job?.city) || 'Remote'}`,
    `Type: ${clean(job?.type || job?.jobType) || 'Full-time'}${job?.workMode ? ` - ${clean(job.workMode)}` : ''}`,
    sal ? `Salary: ${sal}` : '',
    exp ? `Experience: ${exp}` : '',
    section('About:', description, full ? 800 : 400),
    section('Requirements:', requirements, full ? 600 : 300),
    section('Benefits:', benefits, full ? 400 : 200),
    skills,
    `\nApply: ${applyUrl}`,
    `\n#hiring #jobs #${(dept || 'careers').replace(/\s+/g, '').toLowerCase()}`,
  ].filter(Boolean).join('\n')

  // Hard cap at 2600 chars -- iteratively truncate description until it fits
  const MAX = 2600
  if (post.length > MAX) {
    let shortDesc = description || ''
    while (post.length > MAX && shortDesc.length > 50) {
      shortDesc = shortDesc.slice(0, shortDesc.length - 50)
    }
    post = [
      `We're Hiring: ${clean(job?.title) || 'Open Role'}`,
      dept ? `Company: ${dept}` : '',
      `Location: ${clean(job?.location || job?.city) || 'Remote'}`,
      `Type: ${clean(job?.type || job?.jobType) || 'Full-time'}`,
      sal ? `Salary: ${sal}` : '',
      exp ? `Experience: ${exp}` : '',
      shortDesc ? `\nAbout: ${shortDesc}...` : '',
      `\nApply: ${applyUrl}`,
      `\n#hiring #jobs`,
    ].filter(Boolean).join('\n')
  }

  return post
}

const shortText = (job) => `We're hiring: ${clean(job?.title)} - ${clean(job?.location || job?.city) || 'Remote'}. Apply here:`

// Static registry — the SINGLE source of truth for every job board. Each board
// describes WHAT it is + how it distributes (kind / href / board) AND carries the
// display metadata the board UIs show (method label, reach, cost, features).
// Keep ids stable — they're matched against the wizard's selected boards.
const BOARD_REGISTRY = [
  // --- preview: share a URL; the platform's crawler scrapes OG tags → rich card ---
  { id: 'linkedin', name: 'LinkedIn', emoji: '🔗', color: '#0A66C2', kind: 'preview', region: 'global',
    href: (s) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(s.shareUrl)}`, copyCaption: true,
    method: 'Rich preview + copy caption', reach: '900M+', cost: 'Free',
    features: ['Rich Link Preview', 'One-click Share', 'Caption auto-copied'] },

  // --- intent: pre-filled composer (one-click share) ---
  { id: 'twitter', name: 'X / Twitter', emoji: '𝕏', color: '#1A1A1A', kind: 'intent', region: 'global',
    href: (s) => `https://twitter.com/intent/tweet?text=${enc(s.short)}&url=${enc(s.shareUrl)}&hashtags=hiring,jobs`,
    method: 'Pre-filled post', reach: '500M+', cost: 'Free',
    features: ['Pre-filled Composer', 'Hashtags', 'One-click Post'] },
  { id: 'whatsapp', name: 'WhatsApp', emoji: '🟢', color: '#25D366', kind: 'intent', region: 'global',
    href: (s) => `https://wa.me/?text=${enc(s.post)}`,
    method: 'Pre-filled message', reach: '2B+', cost: 'Free',
    features: ['Pre-filled Message', 'Share to Groups / Contacts'] },

  // --- manual: copy post + open the board's post-job page ---
  { id: 'naukri', name: 'Naukri.com', emoji: '🟠', color: '#FF6B35', kind: 'manual', region: 'india',
    board: 'https://www.naukri.com/recruit/post-job',
    method: 'Copy & open board', reach: '80M+', cost: 'Free (basic)',
    features: ['Resume Access', 'Recruiter Dashboard', 'Talent Pool'] },
  { id: 'internshala', name: 'Internshala', emoji: '🎓', color: '#00AAEC', kind: 'manual', region: 'india',
    board: 'https://internshala.com/hire/',
    method: 'Copy & open board', reach: '21M+', cost: 'Free (basic)',
    features: ['Intern Pipeline', 'Training Programs', 'Fresher Jobs'] },
  { id: 'glassdoor', name: 'Glassdoor', emoji: '🟢', color: '#0CAA41', kind: 'manual', region: 'global',
    board: 'https://www.glassdoor.com/employers/post-job/',
    method: 'Copy & open board', reach: '55M+', cost: 'Free (basic)',
    features: ['Company Reviews', 'Salary Data', 'Employer Branding'] },

  // --- feed: fully automated, zero clicks ---
  { id: 'google_jobs', name: 'Google for Jobs', emoji: '🔍', color: '#4285F4', kind: 'feed', region: 'global',
    note: 'Auto-indexed from the apply page JSON-LD — no posting needed.',
    method: 'Auto (JSON-LD)', reach: '1B+', cost: 'Free (auto-indexed)',
    features: ['JSON-LD Schema', 'Auto Indexing', 'Search Integration'] },
  { id: 'indeed_feed', name: 'Indeed XML Feed', emoji: '📡', color: '#2164F3', kind: 'feed', region: 'global',
    href: () => `${getBaseUrl()}/feed/jobs.xml`, note: 'Submit this XML feed once at Indeed → auto-syncs.',
    method: 'Auto (XML feed)', reach: '250M+', cost: 'Free (auto-indexed)',
    features: ['XML Feed Auto-sync', 'Submit Once', 'Auto Updates'] },
]

const enc = encodeURIComponent

/**
 * Build the platform action list for a job.
 * @param {object} job
 * @param {string} region  one of REGIONS keys ('all' | 'global' | 'india' | 'uk')
 * Each item: { id, name, emoji, color, kind, region, href?, post?, board?, note?, copyCaption? }
 *  - href  : open in a new tab (preview / intent / feed)
 *  - post  : ready-to-paste text (manual + copyCaption previews)
 *  - board : the board's own post-job page (manual — opened after copy)
 */
export function getSharePlatforms(job, region = 'all') {
  const applyUrl = getApplyUrl(job)
  const ctx = {
    applyUrl,
    shareUrl: getShareUrl(job),
    post: buildPostText(job, applyUrl),
    short: shortText(job),
    title: clean(job?.title) || 'Open Role',
  }
  return BOARD_REGISTRY
    .filter((b) => region === 'all' || b.region === region || b.region === 'global')
    .map((b) => ({
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      color: b.color,
      kind: b.kind,
      region: b.region,
      note: b.note,
      copyCaption: b.copyCaption,
      href: typeof b.href === 'function' ? b.href(ctx) : undefined,
      board: b.board,
      post: b.kind === 'manual' || b.copyCaption ? ctx.post : undefined,
    }))
}

export function getBoardById(id) {
  return BOARD_REGISTRY.find((b) => b.id === id) || null
}

// How each "kind" is labelled on the board cards / publish step. Every board is
// reachable (free, no API), so the "status" is informational, not a connect-gate.
const KIND_STATUS = {
  feed: 'auto',     // hands-off — indexed from our feed/JSON-LD
  preview: 'ready', // one-click share with rich card
  intent: 'ready',  // one-click pre-filled composer
  manual: 'ready',  // copy & open the board
}

/**
 * The board list the UI screens render (wizard Publish step + Job Boards page).
 * Derived from the SAME registry as the Distribute panel, so there's one list,
 * no duplicates, and nothing cosmetic. Shape matches what those screens read:
 *   { id, name, logo, color, status, region, method, avgReach, costPerPost, features, kind }
 */
export const JOB_BOARDS = BOARD_REGISTRY.map((b) => ({
  id: b.id,
  name: b.name,
  logo: b.emoji,
  color: b.color,
  status: KIND_STATUS[b.kind] || 'ready',
  region: b.region,
  category: b.region,
  method: b.method || SHARE_KINDS[b.kind]?.label || '',
  avgReach: b.reach || '—',
  costPerPost: b.cost || 'Free',
  features: b.features || [],
  kind: b.kind,
}))

// Status chips for board postings (kept here so the boards page has one import).
export const BOARD_POST_STATUSES = {
  live: { label: 'Live', color: '#00B894', icon: '🟢' },
  scheduled: { label: 'Scheduled', color: '#74B9FF', icon: '🕐' },
  paused: { label: 'Paused', color: '#FDCB6E', icon: '⏸️' },
  expired: { label: 'Expired', color: '#636E72', icon: '⏰' },
  error: { label: 'Error', color: '#FF6B6B', icon: '❌' },
  draft: { label: 'Not Posted', color: '#9B9BC0', icon: '-' },
}
