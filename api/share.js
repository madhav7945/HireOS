// Vercel Serverless Function — Open Graph share page for a job.
// Endpoint: /api/share?id=...&t=Title&d=Desc&l=Location&c=Company&s=Salary&dept=...
//
// Why: SPAs can't expose <meta> tags to link-preview crawlers (LinkedIn,
// WhatsApp, Slack, Facebook…) — those bots don't run JavaScript. This function
// returns server-rendered OG/Twitter tags built from the query params, so the
// shared link shows the job title + description + salary, then redirects real
// humans to the public apply page. No paid API and no database needed.

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export default function handler(req, res) {
  const q = req.query || {}
  const id = esc(q.id || 'new')
  const title = esc(q.t || 'Open Role')
  const company = esc(q.c || 'HireOS')
  const location = esc(q.l || 'Remote')
  const dept = esc(q.dept || '')
  const salary = esc(q.s || '')
  const descParts = [q.d ? esc(q.d) : '', location && `📍 ${location}`, salary && `💰 ${salary}`].filter(Boolean)
  const description = descParts.join('  ·  ').slice(0, 300) || `Apply now for ${title} at ${company}.`

  const proto = (req.headers['x-forwarded-proto'] || 'https')
  const host = req.headers.host
  const origin = `${proto}://${host}`
  const applyUrl = `${origin}/apply/${id}`
  const ogTitle = `${title}${dept ? ` — ${dept}` : ''} | ${company}`
  // A simple, reliable OG image via a placeholder service (no asset hosting needed).
  const ogImage = `https://placehold.co/1200x630/6C5CE7/ffffff/png?text=${encodeURIComponent(`${q.t || 'We are hiring'}`)}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${ogTitle}</title>
<meta name="description" content="${description}" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${ogTitle}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${applyUrl}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:site_name" content="HireOS" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${ogTitle}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImage}" />

<link rel="canonical" href="${applyUrl}" />
<meta http-equiv="refresh" content="0; url=${applyUrl}" />
<script>window.location.replace(${JSON.stringify(applyUrl)});</script>
</head>
<body style="font-family:system-ui,sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center">
  <h1 style="margin:0 0 8px">${ogTitle}</h1>
  <p style="color:#9a9ac0">${description}</p>
  <p><a href="${applyUrl}" style="color:#a78bfa">Continue to the application →</a></p>
</div>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')
  res.status(200).send(html)
}
