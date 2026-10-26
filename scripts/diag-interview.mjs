import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('pageerror: ' + (e.message || e)))

await page.goto('http://localhost:5174/interview/demo', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 1500))

// Expect the Join lobby first.
const preJoin = await page.evaluate(() => ({
  hasJoinBtn: [...document.querySelectorAll('button')].some(b => /join interview/i.test(b.textContent)),
  heading: document.querySelector('h1')?.innerText || '',
}))
console.log('PRE-JOIN:', JSON.stringify(preJoin))

// Click "Join Interview".
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /join interview/i.test(x.textContent))
  if (b) { b.click(); return true }
  return false
})
console.log('CLICKED JOIN:', clicked)

// Watch the AI status settle to listening (mic unblocked) after the opening line.
const trail = []
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 1500))
  trail.push(await page.evaluate(() => document.querySelector('.ci-caption-status')?.innerText || '?'))
}
console.log('STATUS TRAIL:', trail.join(' → '))

const after = await page.evaluate(() => {
  // open chat tab to read messages
  const chatTab = [...document.querySelectorAll('.ci-sidepanel-tab')].find(t => /chat/i.test(t.textContent))
  chatTab?.click()
  return {
    engine: document.querySelector('.ci-engine-pill')?.innerText || '',
    aiMsgs: [...document.querySelectorAll('.ci-chat-bubble')].map(n => n.innerText.slice(0, 70)),
  }
})
console.log('ENGINE:', after.engine)
console.log('AI MESSAGES:', JSON.stringify(after.aiMsgs, null, 2))
console.log('CONSOLE ERRORS (non-network):', errors.filter(e => !/websocket|placeholder|ERR_|favicon|tensorflow|coco/i.test(e)).slice(0, 5))
await browser.close()
