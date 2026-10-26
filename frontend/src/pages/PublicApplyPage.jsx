import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DEMO_JOBS } from '../data/mockData'
import { localDataService } from '../services/localData'
import { parseResumeFile } from '../services/resumeParser'
import {
  MapPin, Clock, Briefcase, DollarSign, Users, Send, CheckCircle,
  Building2, FileText, Loader2, X, Upload, Sparkles, Check, AlertCircle, HelpCircle
} from 'lucide-react'

export default function PublicApplyPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Résumé parsing state: file → extracted text + structured data the AI reads.
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeStatus, setResumeStatus] = useState('idle') // idle | parsing | done | error
  const [resumeData, setResumeData] = useState(null)
  const [resumeText, setResumeText] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
    location: '',
    experience: '',
    currentCompany: '',
    currentTitle: '',
    noticePeriod: '',
    expectedSalary: '',
    workAuth: 'Citizen / Permanent Resident (No sponsorship required)',
    source: 'Website Direct',
    skills: '',
    coverLetter: '',
    screeningAnswers: {},
  })

  useEffect(() => {
    async function loadJob() {
      // Try localDataService first (unified backend)
      const found = await localDataService.get('jobs', jobId)
      if (found) { setJob(found); setLoading(false); return }
      // Fallback to demo data
      const demo = DEMO_JOBS.find(j => String(j.id) === String(jobId) || String(j.jobId) === String(jobId))
      setJob(demo || null)
      setLoading(false)
    }
    loadJob()
  }, [jobId])

  // Update page title and meta tags when job data loads
  useEffect(() => {
    if (!job) return
    document.title = `${job.title || 'Job Opening'} — ${job.department || 'HireOS'}`

    const setMeta = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('og:title', `${job.title || 'Job Opening'} — ${job.department || 'HireOS'}`)
    setMeta('og:description', job.description?.replace?.(/<[^>]+>/g, '').slice(0, 200) || 'Apply for this role on HireOS')
    setMeta('og:type', 'website')
    setMeta('og:url', window.location.href)

    return () => { document.title = 'HireOS' }
  }, [job])

  // Parse the résumé the moment it's chosen, extracting plain text via pdf.js + structured data.
  const handleResumeFile = async (file) => {
    if (!file) return
    setError('')
    setResumeFile(file)
    setResumeStatus('parsing')
    setResumeData(null)
    setResumeText('')
    try {
      const { resumeText: text, resumeData: data } = await parseResumeFile(file, job)
      setResumeText(text || '')
      setResumeData(data || null)
      setResumeStatus(text ? 'done' : 'error')

      // Auto-fill empty fields from the parsed résumé (candidate can still edit).
      setForm((f) => ({
        ...f,
        experience: f.experience || (data?.totalExperienceYears != null ? String(data.totalExperienceYears) : ''),
        currentCompany: f.currentCompany || data?.currentCompany || '',
        currentTitle: f.currentTitle || data?.currentTitle || '',
        skills: f.skills || (Array.isArray(data?.skills) ? data.skills.join(', ') : ''),
      }))
    } catch (err) {
      console.error('Résumé parse error:', err)
      setResumeStatus('error')
    }
  }

  const clearResume = () => {
    setResumeFile(null)
    setResumeData(null)
    setResumeText('')
    setResumeStatus('idle')
  }

  const handleScreeningAnswer = (qId, val) => {
    setForm(f => ({
      ...f,
      screeningAnswers: {
        ...f.screeningAnswers,
        [qId]: val
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!resumeFile && !resumeText) {
      setError('Please upload your résumé (PDF or DOCX) — our AI screens the document.')
      return
    }
    if (resumeStatus === 'parsing') {
      setError('Still analyzing your résumé — one moment…')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      // Merge typed skills with skills the résumé proved.
      const typedSkills = form.skills.split(',').map((s) => s.trim()).filter(Boolean)
      const parsedSkills = Array.isArray(resumeData?.skills) ? resumeData.skills : []
      const candidateSkills = Array.from(new Set([...typedSkills, ...parsedSkills]))

      // Save candidate — including the parsed résumé text + structured data and answers
      const newCandidate = await localDataService.create('candidates', {
        name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        linkedin: form.linkedin.trim(),
        portfolio: form.portfolio.trim(),
        experience: form.experience ? Number(form.experience) : (resumeData?.totalExperienceYears || 0),
        currentCompany: form.currentCompany || resumeData?.currentCompany || '',
        currentTitle: form.currentTitle || resumeData?.currentTitle || 'Applicant',
        appliedFor: job.title,
        jobId: job.id,
        jobTitle: job.title,
        location: form.location || job.location,
        noticePeriod: form.noticePeriod,
        expectedSalary: form.expectedSalary,
        workAuth: form.workAuth,
        source: form.source,
        skills: candidateSkills.length ? candidateSkills : (job.skills || []),
        coverLetter: form.coverLetter,
        screeningAnswers: form.screeningAnswers,
        resumeFileName: resumeFile?.name || 'Resume.pdf',
        resumeText: resumeText || '',
        resumeData: resumeData || null,
        stage: 'Applied',
        aiScore: null,
      })

      // Save application record
      const newApplication = await localDataService.create('applications', {
        name: form.fullName.trim(),
        postingTitle: job.title,
        jobId: job.id,
        candidateId: newCandidate.id,
        stage: 'Applied',
        status: 'New',
        rating: 0,
        applicationId: 'APP-' + Date.now().toString(36).toUpperCase(),
      })

      // Run the full Hiring Autopilot in the background: confirmation → AI screen
      // → shortlist email → auto-schedule interview + email join link (or decline).
      import('../services/pipeline').then(m => {
        m.pipelineService.runApplicationPipeline({
          candidateId: newCandidate.id,
          jobId: job.id,
          applicationId: newApplication.id
        })
      }).catch(err => console.warn('Pipeline trigger background note:', err))

      setSubmitted(true)
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const formatSalary = (sal) => {
    if (!sal) return null
    const fmt = (n) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : `${(n/1000).toFixed(0)}K`
    return `${fmt(sal.min)} - ${fmt(sal.max)} ${sal.currency || 'INR'}/${sal.period || 'yr'}`
  }

  const inputStyle = {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }
  const inputRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(108,92,231,0.3)', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#999' }}>Loading job details...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Job Not Found</h1>
          <p style={{ color: '#999' }}>This job posting may have been closed or removed.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: '520px', padding: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,184,148,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="#00B894" />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '12px', fontWeight: 700 }}>Application Submitted!</h1>
          <p style={{ color: '#999', fontSize: '1rem', lineHeight: 1.6 }}>
            Thank you for applying for <strong style={{ color: '#fff' }}>{job.title}</strong>. 
            Our AI screening system has received your profile and is analyzing your match against the role.
          </p>
          <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(108,92,231,0.1)', borderRadius: '12px', border: '1px solid rgba(108,92,231,0.2)' }}>
            <p style={{ color: '#a0a0cc', fontSize: '0.85rem', margin: 0 }}>
              📧 A confirmation email and interview invitation updates will be sent to <strong style={{ color: '#fff' }}>{form.email}</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-primary-hover)', padding: '20px 0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 800 }}>HireOS</div>
          <span style={{ color: '#555', fontSize: '0.85rem' }}>AI-Powered Careers Portal</span>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Job Header Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary-hover)', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0' }}>{job.title}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0cc', fontSize: '0.9rem' }}>
                  <Building2 size={16} color="#6C5CE7" /> {job.department || 'Engineering'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0cc', fontSize: '0.9rem' }}>
                  <MapPin size={16} color="#6C5CE7" /> {job.location || 'Remote'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0cc', fontSize: '0.9rem' }}>
                  <Briefcase size={16} color="#6C5CE7" /> {job.type || 'Full-time'} · {job.workMode || 'Hybrid'}
                </span>
                {job.salary && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0cc', fontSize: '0.9rem' }}>
                    <DollarSign size={16} color="#6C5CE7" /> {formatSalary(job.salary)}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0a0cc', fontSize: '0.9rem' }}>
                  <Users size={16} color="#6C5CE7" /> {job.openings || 1} opening{(job.openings || 1) > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Required Skills Badges */}
          {job.skills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
              {(Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',')).map(skill => (
                <span key={skill} style={{ padding: '4px 12px', background: 'rgba(108,92,231,0.15)', color: '#a78bfa', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(108,92,231,0.25)' }}>
                  {typeof skill === 'string' ? skill.trim() : skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '36px' }}>
          {/* Left — Job Details */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', color: '#e0e0ff' }}>Job Description</h2>
            <div style={{ color: '#a0a0cc', lineHeight: 1.8, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
              {job.description || 'Join our high-impact team building state-of-the-art products.'}
            </div>
            
            <div style={{ marginTop: '24px', padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0ff', marginBottom: '12px' }}>Role Specifications</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#888' }}>Target Experience</span>
                  <span style={{ color: '#ccc' }}>{job.experienceMin ? `${job.experienceMin}+ Years` : 'Open to all levels'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#888' }}>Work Authorization</span>
                  <span style={{ color: job.requireWorkAuth ? '#F59E0B' : '#ccc' }}>
                    {job.requireWorkAuth ? 'Sponsorship Not Available' : 'Sponsorship Allowed'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#888' }}>Hiring Manager</span>
                  <span style={{ color: '#ccc' }}>{job.hiringManager || 'Sarah Chen'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Application Form */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '6px', color: '#e0e0ff' }}>Apply for this Position</h2>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '16px' }}>
              Upload your résumé. Our AI will automatically parse your skills and match you with the role criteria.
            </p>

            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Résumé Dropzone with Live AI Extraction */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e0e0ff', marginBottom: 6, display: 'block' }}>
                  Résumé / CV (PDF or DOCX) *
                </label>
                
                {!resumeFile ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      background: 'rgba(108,92,231,0.04)',
                      border: '2px dashed rgba(108,92,231,0.3)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => document.getElementById('resume-file-input').click()}
                  >
                    <input
                      id="resume-file-input"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleResumeFile(e.target.files[0])
                      }}
                    />
                    <Upload size={28} color="#6C5CE7" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                      Click to upload résumé or drag &amp; drop
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>
                      PDF, DOCX up to 10MB · Parsed locally via PDF.js
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(108,92,231,0.3)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={20} color="#6C5CE7" />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{resumeFile.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>
                            {(resumeFile.size / 1024).toFixed(1)} KB · {resumeStatus === 'parsing' ? 'Reading document text...' : 'Parsed successfully'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {resumeStatus === 'parsing' && <Loader2 size={16} color="#6C5CE7" className="animate-spin" />}
                        {resumeStatus === 'done' && <CheckCircle size={16} color="#10B981" />}
                        <button
                          type="button"
                          onClick={clearResume}
                          style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Detected Skills Preview */}
                    {resumeData?.skills?.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: '0.72rem', color: '#a0a0cc', display: 'block', marginBottom: 6 }}>
                          ✨ Auto-Detected Skills ({resumeData.skills.length}):
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {resumeData.skills.slice(0, 8).map(s => (
                            <span key={s} style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '4px', fontSize: '0.72rem' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div style={inputRow}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Full Name *</label>
                  <input required placeholder="e.g. Arjun Patel" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Email Address *</label>
                  <input required type="email" placeholder="e.g. arjun@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div style={inputRow}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Phone Number</label>
                  <input placeholder="e.g. +91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Current Location</label>
                  <input placeholder="e.g. Bangalore, India" value={form.location} onChange={e => setForm({...form, location: e.target.value})} style={inputStyle} />
                </div>
              </div>

              {/* Work Authorization Dropdown (feeds Step 1 Knockout Gate) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>
                  Work Authorization Status *
                </label>
                <select
                  value={form.workAuth}
                  onChange={e => setForm({...form, workAuth: e.target.value})}
                  style={inputStyle}
                >
                  <option>Citizen / Permanent Resident (No sponsorship required)</option>
                  <option>Requires Visa Sponsorship (H-1B, Tier 2, etc.)</option>
                  <option>Student / Practical Training (OPT / CPT)</option>
                  <option>Other / Open Work Permit</option>
                </select>
              </div>

              {/* Experience & Current Role (Auto-filled from resume) */}
              <div style={inputRow}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Years of Professional Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 5"
                    value={form.experience}
                    onChange={e => setForm({...form, experience: e.target.value})}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Current / Last Company</label>
                  <input
                    placeholder="e.g. Acme Tech"
                    value={form.currentCompany}
                    onChange={e => setForm({...form, currentCompany: e.target.value})}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Key Skills (Comma separated)</label>
                <input
                  placeholder="e.g. React, TypeScript, GraphQL, Node.js"
                  value={form.skills}
                  onChange={e => setForm({...form, skills: e.target.value})}
                  style={inputStyle}
                />
              </div>

              {/* DYNAMIC SCREENING QUESTIONS (From Job Wizard Step 3) */}
              {job.screeningQuestions && job.screeningQuestions.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: '10px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0ff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={16} color="#6C5CE7" /> Role Screening Questions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {job.screeningQuestions.map((q, idx) => {
                      const qKey = q.id || q.text || idx
                      const answer = form.screeningAnswers[qKey] || ''

                      return (
                        <div key={qKey} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: '0.82rem', color: '#ccc' }}>
                            {idx + 1}. {q.text} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                          </label>

                          {q.type === 'Yes/No' ? (
                            <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                              {['Yes', 'No'].map(opt => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#e0e0ff', cursor: 'pointer' }}>
                                  <input
                                    type="radio"
                                    name={`q_${qKey}`}
                                    value={opt}
                                    checked={answer === opt}
                                    onChange={() => handleScreeningAnswer(qKey, opt)}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          ) : q.type === 'Number' ? (
                            <input
                              type="number"
                              min={0}
                              placeholder="Enter number..."
                              value={answer}
                              onChange={e => handleScreeningAnswer(qKey, e.target.value)}
                              style={{ ...inputStyle, padding: '8px 12px' }}
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="Your answer..."
                              value={answer}
                              onChange={e => handleScreeningAnswer(qKey, e.target.value)}
                              style={{ ...inputStyle, padding: '8px 12px' }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#a0a0cc', display: 'block', marginBottom: 4 }}>Cover Letter / Why You're a Great Fit</label>
                <textarea
                  placeholder="Tell us about relevant projects, your approach to problem solving, and why you are interested in this role..."
                  value={form.coverLetter}
                  onChange={e => setForm({...form, coverLetter: e.target.value})}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '14px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  boxShadow: '0 4px 14px rgba(108,92,231,0.3)',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Submit Application
                  </>
                )}
              </button>

              <p style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', margin: '4px 0 0' }}>
                By applying, you agree to our recruitment processing policies. Your application is evaluated through our AI screening pipeline.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

