import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const BASE = 'http://localhost:5174'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'scripts/shots'
fs.mkdirSync(OUT, { recursive: true })

const routes = [
  ['dashboard', '/'],
  ['jobs', '/jobs'],
  ['jobs-create', '/jobs/create'],
  ['candidates', '/candidates'],
  ['my-actions', '/my-actions'],
  ['applications', '/applications'],
  ['departments', '/departments'],
  ['calendar', '/calendar'],
  ['pipeline', '/pipeline'],
  ['ai-shortlist', '/ai-shortlist'],
  ['job-boards', '/job-boards'],
  ['interviews', '/interviews'],
  ['offers', '/offers'],
  ['referrals', '/referrals'],
  ['reports', '/reports'],
  ['settings', '/settings'],
  ['apply', '/apply/job-001'],
  ['interview', '/interview/demo'],
  ['hr-observe', '/hr-observe/demo'],
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

let buf = []
page.on('console', (m) => { if (m.type() === 'error') buf.push('console.error: ' + m.text()) })
page.on('pageerror', (e) => buf.push('pageerror: ' + (e.message || e)))

const results = []

// 1) Load login and use the demo login (demo mode shows the button).
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 800))
buf = []
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /demo login/i.test(b.textContent))
  if (btn) { btn.click(); return true }
  return false
})
await new Promise(r => setTimeout(r, 1500))
results.push({ name: 'login', path: '/login', demoLoginClicked: clicked, finalPath: await page.evaluate(() => location.pathname), errors: [...buf] })
await page.screenshot({ path: `${OUT}/00-login.png` })

// 2) Visit every route via client-side routing (no reload → keeps the session).
let i = 1
for (const [name, path] of routes) {
  buf = []
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await new Promise(r => setTimeout(r, 1800))
  const info = await page.evaluate(() => {
    const root = document.getElementById('root')
    return {
      finalPath: location.pathname,
      rootChildren: root ? root.children.length : 0,
      textLen: (root?.innerText || '').trim().length,
      h1: document.querySelector('h1,h2')?.innerText?.slice(0, 60) || '',
    }
  })
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}-${name}.png` })
  const redirected = info.finalPath !== path && !(path === '/' && info.finalPath === '/')
  results.push({ name, path, ...info, redirectedToLogin: info.finalPath === '/login', errors: [...buf] })
  i++
}

await browser.close()

// Report
console.log('\n=== PAGE SWEEP REPORT ===')
let bad = 0
for (const r of results) {
  const errs = (r.errors || []).filter(e => !/favicon|tensorflow|coco|cdn|net::ERR|Failed to load resource/i.test(e))
  const blank = r.textLen !== undefined && r.textLen < 20
  const loginRedirect = r.redirectedToLogin && r.path !== '/login'
  const status = (errs.length || blank || loginRedirect) ? 'FAIL' : 'OK'
  if (status === 'FAIL') bad++
  console.log(`[${status}] ${r.name.padEnd(13)} ${String(r.path).padEnd(18)} text=${r.textLen ?? '-'} h=${JSON.stringify(r.h1 || '')}${loginRedirect ? ' <redirected-to-login>' : ''}${blank ? ' <blank>' : ''}`)
  for (const e of errs.slice(0, 4)) console.log('        ' + e.slice(0, 160))
}
console.log(`\n${results.length} pages • ${bad} with issues • screenshots in ${OUT}/`)
