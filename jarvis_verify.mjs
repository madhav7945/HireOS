import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OUT = 'C:\\\\Users\\\\madha\\\\hireos_verify';
const URL = 'http://localhost:5173/interview/demo';
const CDP = 'http://127.0.0.1:9222';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('[jarvis]', ...a);

async function dumpChat(page, tag) {
  // Try to read visible chat message text from the DOM heuristically.
  const data = await page.evaluate(() => {
    const out = { url: location.href, title: document.title, errors: [], chat: [], statusText: [] };
    // Collect any element whose text mentions mic/listening/speaking/muted
    const all = Array.from(document.querySelectorAll('body *'));
    const seen = new Set();
    for (const el of all) {
      const t = (el.innerText || '').trim();
      if (!t) continue;
      if (t.length > 0 && t.length < 80) {
        const low = t.toLowerCase();
        if ((low.includes('mic') || low.includes('listening') || low.includes('muted') ||
             low.includes('speaking') || low.includes('ai is') ) && !seen.has(t)) {
          seen.add(t); out.statusText.push(t);
        }
      }
    }
    return out;
  });
  fs.writeFileSync(`${OUT}\\\\dom_${tag}.json`, JSON.stringify(data, null, 2));
  return data;
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: { width: 1440, height: 900 } });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('localhost:5173')) || pages[0];
  if (!page) page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Capture console + page errors
  const consoleMsgs = [];
  page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));

  log('navigating');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => log('goto warn', e.message));
  await sleep(2500);

  // Screenshot lobby
  await page.screenshot({ path: `${OUT}\\\\1_lobby.png` });
  log('lobby screenshot done');
  await dumpChat(page, 'lobby');

  // Find and click "Join now"
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role=button], a'));
    const b = btns.find(x => /join now|join/i.test((x.innerText || '').trim()));
    if (b) { b.click(); return (b.innerText||'').trim(); }
    return null;
  });
  log('join click:', clicked);
  await sleep(15000); // wait for interview to go live + AI greeting

  await page.screenshot({ path: `${OUT}\\\\2_live.png` });
  log('live screenshot done');
  await dumpChat(page, 'live');

  // Open Chat panel — try the side panel tab and bottom bar
  const chatOpen = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, [role=tab], [role=button], a, div'));
    const c = candidates.filter(x => {
      const t = (x.innerText || '').trim().toLowerCase();
      const al = (x.getAttribute('aria-label') || '').toLowerCase();
      return t === 'chat' || al === 'chat' || t.includes('chat');
    });
    // prefer shortest text match (the actual button, not a container)
    c.sort((a,b)=> (a.innerText||'').length - (b.innerText||'').length);
    if (c[0]) { c[0].click(); return (c[0].innerText||c[0].getAttribute('aria-label')||'').trim(); }
    return null;
  });
  log('chat open click:', chatOpen);
  await sleep(2500);

  await page.screenshot({ path: `${OUT}\\\\3_chat.png` });
  log('chat screenshot done');

  // Extract chat messages — grab all reasonably-sized text blocks in the chat region
  const chatDump = await page.evaluate(() => {
    // Gather candidate message texts across the page
    const nodes = Array.from(document.querySelectorAll('p, span, div, li'));
    const msgs = [];
    const seen = new Set();
    for (const n of nodes) {
      // only leaf-ish nodes (avoid huge containers)
      if (n.children.length > 3) continue;
      const t = (n.innerText || '').trim();
      if (t.length >= 8 && t.length < 600 && !seen.has(t)) {
        seen.add(t);
        msgs.push(t);
      }
    }
    return msgs;
  });
  fs.writeFileSync(`${OUT}\\\\chat_messages.json`, JSON.stringify(chatDump, null, 2));
  fs.writeFileSync(`${OUT}\\\\console.json`, JSON.stringify(consoleMsgs, null, 2));
  log('done. messages:', chatDump.length);

  await browser.disconnect();
})().catch(e => { console.error('[jarvis] FATAL', e); process.exit(1); });
