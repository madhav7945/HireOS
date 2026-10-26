import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:\Program Files\Google\Chrome\Application\chrome.exe', headless:'new', args:['--no-sandbox'] })
const p = await b.newPage()
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('pageerror:'+e.message))
await p.goto('http://localhost:5174/login',{waitUntil:'networkidle2'})
await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(b=>/demo login/i.test(b.textContent)); x&&x.click() })
await new Promise(r=>setTimeout(r,1500))
await p.evaluate(()=>{ window.history.pushState({},'', '/meetings'); window.dispatchEvent(new PopStateEvent('popstate')) })
await new Promise(r=>setTimeout(r,1500))
const info = await p.evaluate(()=>({
  sidebarHasMeetings: [...document.querySelectorAll('.sidebar-nav-text')].some(n=>/meetings/i.test(n.textContent)),
  heading: document.querySelector('.page-title')?.innerText||'',
  hasNew: [...document.querySelectorAll('button')].some(b=>/new meeting/i.test(b.textContent)),
}))
console.log('MEETINGS:', JSON.stringify(info))
console.log('ERRORS:', errs.filter(e=>!/websocket|placeholder|ERR_/i.test(e)).slice(0,4))
await b.close()
