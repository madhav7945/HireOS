import { createClient } from '@supabase/supabase-js'

// Serverless Function — serves standards-compliant Indeed XML job feed
// Endpoint: /api/feed (rewritten from /feed/jobs.xml via vercel.json)
//
// Connects to Supabase to fetch live job data.
// Falls back to DEMO_JOBS if Supabase is not configured or returns no data.
//
// Spec: https://www.indeed.com/intl/en/xmlfeed/doc.html

const DEMO_JOBS = [
  {
    id: 'job-001',
    title: 'Senior React Developer',
    department: 'Engineering',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'IN',
    location: 'Bangalore, India',
    type: 'Full-time',
    status: 'live',
    description: 'We are looking for a Senior React Developer to join our growing engineering team.',
    salary: { min: 2000000, max: 3500000, currency: 'INR', period: 'year' },
    postedOn: '2025-05-22',
    company: 'HireOS',
    experience: '4-8 years',
    remote: false,
    hybrid: true,
  },
]

function escapeXml(unsafe) {
  if (!unsafe) return ''
  if (typeof unsafe !== 'string') return escapeXml(String(unsafe))
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toIsoDate(dateStr) {
  try { return new Date(dateStr).toISOString() }
  catch { return new Date().toISOString() }
}

function buildSalaryXml(salary) {
  if (!salary || !salary.min || !salary.max) return ''
  const currency = escapeXml(salary.currency || 'INR')
  const period = salary.period === 'month' ? 'MONTH' : 'YEAR'
  return `    <salary>
      <currency>${currency}</currency>
      <salary_type>${period}</salary_type>
      <salary_min>${salary.min}</salary_min>
      <salary_max>${salary.max}</salary_max>
    </salary>`
}

function buildRemoteXml(job) {
  if (job.remote) return '    <remote>true</remote>'
  if (job.hybrid) return '    <hybrid>true</hybrid>'
  return ''
}

function generateXML(jobs, siteUrl) {
  const now = new Date().toUTCString()

  const jobEntries = jobs
    .filter(j => j.status === 'live' || j.status === 'open')
    .map(job => {
      const city = job.city || job.location?.split(',')[0]?.trim() || ''
      const state = job.state || job.location?.split(',')[1]?.trim() || ''
      const country = job.country || 'IN'

      let jobtype = 'fulltime'
      const t = (job.type || '').toLowerCase()
     if (t.includes('part')) jobtype = 'parttime'
      if (t.includes('contract')) jobtype = 'contract'
      if (t.includes('intern')) jobtype = 'intern'
      if (t.includes('temporary')) jobtype = 'temporary'

      const salaryXml = buildSalaryXml(job.salary)
      const remoteXml = buildRemoteXml(job)
      const applyUrl = `${siteUrl}/apply/${job.id}?src=indeed-xml&utm_source=indeed&utm_medium=xml_feed`

      return `  <job>
    <title><![CDATA[${job.title || ''}]]></title>
    <date>${toIsoDate(job.postedOn || Date.now())}</date>
    <referencenumber>${job.id}</referencenumber>
    <url>${escapeXml(`${siteUrl}${job.applyUrl || '/apply/' + job.id}`)}</url>
    <apply_url>${escapeXml(applyUrl)}</apply_url>
    <company><![CDATA[${job.company || 'HireOS'}]]></company>
    <department><![CDATA[${job.department || ''}]]></department>
    <location>
      <city><![CDATA[${city}]]></city>
      <state><![CDATA[${state}]]></state>
      <country><![CDATA[${country}]]></country>
    </location>
    <description><![CDATA[${job.description || ''}]]></description>
    <jobtype>${jobtype}</jobtype>
    <category><![CDATA[${job.department || 'General'}]]></category>
    ${job.experience ? `<experience><![CDATA[${job.experience}]]></experience>` : ''}
    ${salaryXml}
    ${remoteXml}
  </job>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>HireOS</publisher>
  <publisherurl>${siteUrl}</publisherurl>
  <lastBuildDate>${now}</lastBuildDate>
  <publisheremail>jobs@hireos.app</publisheremail>
${jobEntries}
</source>`
}

async function fetchJobsFromSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[feed] Supabase error:', error.message)
      return null
    }

    // Parse document-model JSONB data
    return data.map(row => {
      const jobData = row.data || row
      return {
        id: row.id || jobData.id,
        title: jobData.title || 'Untitled Role',
        department: jobData.department || 'General',
        city: jobData.city || (jobData.location || '').split(',')[0]?.trim() || '',
        state: jobData.state || (jobData.location || '').split(',')[1]?.trim() || '',
        country: jobData.country || 'IN',
        location: jobData.location || 'Remote',
        type: jobData.jobType || jobData.type || 'Full-time',
        status: jobData.status || 'draft',
        description: jobData.description || jobData.responsibilities || '',
        salary: jobData.salary || { min: jobData.salaryMin, max: jobData.salaryMax, currency: jobData.currency || 'INR', period: jobData.salaryPeriod || 'year' },
        postedOn: jobData.postedOn || jobData.created_at || row.created_at,
        company: jobData.company || 'HireOS',
        experience: `${jobData.experienceMin || 0}-${jobData.experienceMax || 5} years`,
        remote: (jobData.workMode || '').toLowerCase() === 'remote',
        hybrid: (jobData.workMode || '').toLowerCase() === 'hybrid',
      }
    })
  } catch (err) {
    console.error('[feed] Supabase fetch failed:', err.message)
    return null
  }
}

export default async function handler(req, res) {
  const siteUrl = `https://${req.headers.host || 'hireos-pi.vercel.app'}`

  // Try to fetch live data from Supabase first
  let jobs = await fetchJobsFromSupabase()

  // Fall back to demo jobs if Supabase is not configured or returns nothing
  if (!jobs || jobs.length === 0) {
    console.log('[feed] Using DEMO_JOBS fallback')
    jobs = DEMO_JOBS
  }

  const xml = generateXML(jobs, siteUrl)

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(200).send(xml)
}
