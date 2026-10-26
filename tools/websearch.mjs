#!/usr/bin/env node
/**
 * websearch.mjs — a zero-dependency web search + page reader you run yourself,
 * so Claude can research even when its own WebSearch tool is down.
 *
 * Requires Node 18+ (uses the built-in global `fetch`). No API key needed.
 *
 * USAGE
 *   node tools/websearch.mjs "how does codesignal cosmo ai interview work"
 *   node tools/websearch.mjs --read https://codesignal.com/skills-evaluation-frame/
 *   node tools/websearch.mjs --read https://example.com --max 6000
 *
 * Then copy the printed output back into the chat and Claude will use it.
 *
 * HOW IT WORKS
 *   search : scrapes DuckDuckGo's no-JS HTML endpoint and prints title + url + snippet.
 *   --read : pulls a page as clean markdown via r.jina.ai (free reader proxy),
 *            falling back to a raw fetch + crude tag-strip if that fails.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Unwrap DuckDuckGo's redirect links (//duckduckgo.com/l/?uddg=<encoded>).
function cleanDdgUrl(href) {
  try {
    const m = href.match(/[?&]uddg=([^&]+)/)
    if (m) return decodeURIComponent(m[1])
  } catch (_) {}
  return href.startsWith('//') ? 'https:' + href : href
}

async function search(query) {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error('search HTTP ' + res.status)
  const html = await res.text()

  const results = []
  // Each result block: <a class="result__a" href="...">title</a> ... <a class="result__snippet">snippet</a>
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  const snipRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

  const links = [...html.matchAll(linkRe)]
  const snips = [...html.matchAll(snipRe)]
  for (let i = 0; i < links.length && results.length < 10; i++) {
    const href = cleanDdgUrl(links[i][1])
    const title = stripTags(links[i][2])
    const snippet = snips[i] ? stripTags(snips[i][1]) : ''
    if (title && href) results.push({ title, href, snippet })
  }
  return results
}

async function read(url, maxChars) {
  // Primary: r.jina.ai returns clean markdown of any public page, no key.
  try {
    const res = await fetch('https://r.jina.ai/' + url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const txt = await res.text()
      if (txt && txt.length > 200) return txt.slice(0, maxChars)
    }
  } catch (_) {}
  // Fallback: raw fetch + strip tags.
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error('read HTTP ' + res.status)
  return stripTags(await res.text()).slice(0, maxChars)
}

async function main() {
  const args = process.argv.slice(2)
  if (!args.length) {
    console.error('Usage:\n  node tools/websearch.mjs "your query"\n  node tools/websearch.mjs --read <url> [--max 8000]')
    process.exit(1)
  }

  let maxChars = 8000
  const maxIdx = args.indexOf('--max')
  if (maxIdx !== -1) {
    maxChars = parseInt(args[maxIdx + 1], 10) || 8000
    args.splice(maxIdx, 2)
  }

  if (args[0] === '--read') {
    const url = args[1]
    if (!url) { console.error('--read needs a URL'); process.exit(1) }
    console.log('=== READ: ' + url + ' ===\n')
    try { console.log(await read(url, maxChars)) }
    catch (e) { console.error('Failed to read:', e.message) }
    return
  }

  const query = args.join(' ')
  console.log('=== SEARCH: ' + query + ' ===\n')
  try {
    const results = await search(query)
    if (!results.length) { console.log('No results parsed (DuckDuckGo markup may have changed).'); return }
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`)
      console.log(`   ${r.href}`)
      if (r.snippet) console.log(`   ${r.snippet}`)
      console.log('')
    })
  } catch (e) {
    console.error('Search failed:', e.message)
  }
}

main()
