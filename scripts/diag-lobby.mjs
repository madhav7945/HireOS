import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const b = await puppeteer.launch({ executablePath: CHROME, headless:'new',
  args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('pageerror:'+e.message))
await p.goto('http://localhost:5174/interview/demo',{waitUntil:'networkidle2',timeout:30000})
await new Promise(r=>setTimeout(r,2500))
const lobby = await p.evaluate(()=>({
  hasReadyToJoin: /ready to join/i.test(document.body.innerText),
  hasJoinNow: [...document.querySelectorAll('button')].some(x=>/join now/i.test(x.textContent)),
  hasVideo: !!document.querySelector('video'),
  videoHasStream: !!(document.querySelector('video')?.srcObject),
  toggleBtns: document.querySelectorAll('button').length,
}))
console.log('LOBBY:', JSON.stringify(lobby))
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/join now/i.test(x.textContent)); b&&b.click() })
await new Promise(r=>setTimeout(r,3500))
const live = await p.evaluate(()=>({ caption: document.querySelector('.ci-caption-status')?.innerText||'?', live: !/ready to join/i.test(document.body.innerText) }))
console.log('AFTER JOIN:', JSON.stringify(live))
console.log('ERRORS:', errs.filter(e=>!/websocket|placeholder|429|ERR_/i.test(e)).slice(0,4))
await b.close()
