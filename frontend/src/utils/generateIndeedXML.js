// Generates Indeed-compatible XML job feed
// Indeed XML Spec: https://docs.indeed.com/indeed-apply/xml-feed-specification

export function generateIndeedXML(jobs, siteUrl = 'http://localhost:5173') {
  const now = new Date().toUTCString()

  const jobEntries = jobs
    .filter(job => job.status === 'live' || job.status === 'open')
    .map(job => {
      const city = job.location?.split(',')[0]?.trim() || job.city || ''
      const state = job.location?.split(',')[1]?.trim()?.split(' ')[0] || job.province || ''
      const country = job.country || 'IN'

      // Map job type to Indeed format
      let jobtype = 'fulltime'
      const type = (job.type || '').toLowerCase()
      if (type.includes('part')) jobtype = 'parttime'
      if (type.includes('contract')) jobtype = 'contract'
      if (type.includes('intern')) jobtype = 'internship'
      if (type.includes('temp')) jobtype = 'temporary'

      // Build salary string
      let salary = ''
      if (job.salary?.min && job.salary?.max) {
        salary = `${job.salary.min}-${job.salary.max} ${job.salary.currency || 'INR'}/${job.salary.period || 'year'}`
      } else if (job.salaryRange) {
        salary = job.salaryRange
      }

      const description = job.description || `${job.title} position at our company.`
      const postedDate = job.postedOn || job.created_at || new Date().toISOString()

      return `  <job>
    <title><![CDATA[${job.title}]]></title>
    <date>${new Date(postedDate).toUTCString()}</date>
    <referencenumber>${job.id}</referencenumber>
    <url>${siteUrl}/apply/${job.id}</url>
    <company><![CDATA[HireOS]]></company>
    <city><![CDATA[${city}]]></city>
    <state><![CDATA[${state}]]></state>
    <country>${country}</country>
    <description><![CDATA[${description}]]></description>
    ${salary ? `<salary><![CDATA[${salary}]]></salary>` : ''}
    <jobtype>${jobtype}</jobtype>
    <category><![CDATA[${job.department || 'General'}]]></category>
    ${job.experience ? `<experience><![CDATA[${job.experience}]]></experience>` : ''}
  </job>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>HireOS</publisher>
  <publisherurl>${siteUrl}</publisherurl>
  <lastBuildDate>${now}</lastBuildDate>
${jobEntries}
</source>`
}
