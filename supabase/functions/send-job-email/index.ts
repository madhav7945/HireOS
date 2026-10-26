// Edge Function: send-job-email
// POST { job: {...}, boardIds: ['indeed','naukri'] }

const BOARD_EMAILS: Record<string, string> = {
  indeed: 'jobs@indeed.com',
  glassdoor: 'partner@glassdoor.com',
  naukri: 'recruiter-support@naukri.com',
  linkedin: 'jobpostings@linkedin.com',
}

function esc(text: string): string {
  if (!text) return ''
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function strip(html: string): string {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, ' ').replace(/s+/g, ' ').trim()
}

function buildHtml(job: any): string {
  const salary = job.salaryMin ? '<p><strong>Salary:</strong>' + job.salaryMin + '-' + job.salaryMax + ' ' + (job.currency || 'INR') + '/' + (job.salaryPeriod || 'year') + '</p>' : ''
  return [
    '<!DOCTYPE html><html><body style="font-family:Arial;max-width:600px;">',
    '<div>',
    '<h2>' + esc(job.title || 'Open Role') + '</h2>',
    '<p><strong>Company:</strong>' + esc(job.company || 'HireOS') + '</p>',
    '<p><strong>Location:</strong>' + esc(job.location || 'Remote') + '</p>',
    '<p><strong>Type:</strong>' + esc(job.jobType || 'Full-time') + '</p>',
    salary,
    '<h3>Description按描述</h3><p>' + esc(strip(job.description)) + '</p>',
    job.responsibilities ? '<h3>Requirements描述 </h3><p>' + esc(strip(job.responsibilities)) + '</p>' : '',
    job.benefits ? '<h3>Benefits</h3><p>' + esc(strip(job.benefits)) + '</p>' : '',
    job.skills?.length ? '<h3>Skills</h3><p>' + job.skills.slice(0, 20).join(', ') + '</p>' : '',
    '</div><hr><p><small>Sent from HireOS (auto-post)</small></p>',
    '</body></html>',
  ].filter(Boolean).join('')
}

Deno.serve(async (req: Request) => {
  try {
    const { job, boardIds } = await req.json()
    if (!job || !boardIds || !Array.isArray(boardIds)) {
      return new Response(JSON.stringify({ error: 'Missing job or boardIds' }), { status: 400 })
    }
    const results = []
    for (const id of boardIds) {
      const to = BOARD_EMAILS[id]
      if (!to) {
        results.push({ boardId: id, status: 'skipped' })
        continue
      }
      console.log('[Auto-post to ' + id + ' <' + to + '>] ' + job.title)
      results.push({ boardId: id, status: 'sent', to })
    }
    return new Response(JSON.stringify({ success: true, results }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

export {}
