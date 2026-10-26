import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('pageerror:' + e.message))
await p.goto('http://localhost:5174/meet/meet-demo', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise(r => setTimeout(r, 1500))
const info = await p.evaluate(() => ({
  hasJoin: [...document.querySelectorAll('button')].some(x => /join meeting/i.test(x.textContent)),
  hasNameInput: !!document.querySelector('input'),
  hasInvite: [...document.querySelectorAll('button')].some(x => /invite link/i.test(x.textContent)),
  heading: document.querySelector('h1')?.innerText || '',
}))
console.log('MEET PAGE:', JSON.stringify(info))
console.log('ERRORS:', errs.filter(e => !/websocket|placeholder|ERR_|jitsi|external_api/i.test(e)).slice(0, 5))
await b.close()
