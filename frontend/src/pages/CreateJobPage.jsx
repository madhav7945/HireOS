import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ArrowRight, Save, Eye, Send, Check,
  Briefcase, FileText, SlidersHorizontal, FormInput, Globe, CheckCircle, ChevronDown
} from 'lucide-react'
import BoardPublisher from '../components/BoardPublisher'
import StepBasicInfo from '../components/job-wizard/StepBasicInfo'
import StepJobDetails from '../components/job-wizard/StepJobDetails'
import StepScreening from '../components/job-wizard/StepScreening'
import StepFormBuilder from '../components/job-wizard/StepFormBuilder'
import StepPublish from '../components/job-wizard/StepPublishing'
import StepReview from '../components/job-wizard/StepReview'
import { useCreateJob } from '../hooks/useSupabase'
import '../components/job-wizard/WizardSteps.css'
import './CreateJobPage.css'

const STEPS = [
  { id: 1, label: 'Basic Info', icon: Briefcase },
  { id: 2, label: 'Job Details', icon: FileText },
  { id: 3, label: 'Screening', icon: SlidersHorizontal },
  { id: 4, label: 'Application Form', icon: FormInput },
  { id: 5, label: 'Publish', icon: Globe },
  { id: 6, label: 'Review', icon: CheckCircle },
]

const DEFAULT_JOB = {
  title: '', titleAlias: '', department: '', subDepartment: '',
  hiringManager: '', recruiters: [], openings: 1,
  jobType: 'Full-time', workMode: 'On-site', location: '',
  deadline: '', priority: 'Normal', jobCode: '',
  confidential: false, replacementRole: 'new',
  description: '', responsibilities: '',
  mustHave: [], niceToHave: [], skills: [],
  experienceMin: 0, experienceMax: 5, education: 'Any',
  salaryMin: '', salaryMax: '', currency: 'INR', salaryPeriod: 'yearly',
  showSalary: false, negotiable: false,
  equity: false, equityPercent: '', vestingSchedule: '',
  perks: [], visa: [], targetIndustries: [],
  cultureNote: '', internalNotes: '',
  shortlistThreshold: 75, autoRejectBelow: 50, autoRejectEnabled: false,
  shortlistSize: 25, shortlistScoreFloor: 60, requireWorkAuth: false,
  weightTechnical: 35, weightExperience: 25, weightScreening: 20,
  weightEducation: 10, weightCommunication: 10,
  screeningQuestions: [],
  interviewDuration: '30', interviewLanguage: 'English',
  aiPersona: 'Aria', interviewDifficulty: 'Adaptive', interviewStyle: 'Balanced',
  numCodingQuestions: '2', customQuestions: [],
  phase2At: 0.25, phase3At: 0.80,  // when (as a fraction of duration) coding / Q&A begin
  videoIntroRequired: false, codingAssessment: false, referenceCheck: false,
  formFields: {
    linkedin: false, portfolio: false, github: false, behance: false,
    currentCompany: false, currentTitle: false, currentSalary: false,
    expectedSalary: false, noticePeriod: false, workAuth: false,
    totalYears: false, industry: false, domain: false,
    skillsTags: true, education: true, certifications: false, languages: false,
    profilePhoto: false, videoIntro: false,
    coverLetter: false, personalStatement: false,
  },
  formBrandColor: '#6C5CE7', formIntroMessage: '', formThankYou: '',
  selectedBoards: [],
  publishTargets: [],
  postNow: true, scheduleDate: '', autoExpiry: '', maxApplications: '',
}

const JOB_TEMPLATES = [
  {
    name: 'Senior React Developer',
    data: { title: 'Senior React Developer', department: 'Engineering', jobType: 'Full-time', workMode: 'Hybrid', skills: ['React', 'TypeScript', 'Node.js'], experienceMin: 4, experienceMax: 8, description: 'We are looking for a Senior React Developer to build modern, scalable web applications.' },
  },
  {
    name: 'Product Designer',
    data: { title: 'Product Designer', department: 'Design', jobType: 'Full-time', workMode: 'Remote', skills: ['Figma', 'Prototyping', 'UX Research'], experienceMin: 3, experienceMax: 6, description: 'Join our design team to craft beautiful and intuitive product experiences.' },
  },
  {
    name: 'Data Scientist',
    data: { title: 'Data Scientist', department: 'Data & AI', jobType: 'Full-time', workMode: 'On-site', skills: ['Python', 'TensorFlow', 'Statistics'], experienceMin: 3, experienceMax: 7, description: 'Build ML models for our AI platform. Experience with Python and statistics required.' },
  },
]

function validateStep(step, jobData) {
  const errors = {}
  switch (step) {
    case 1:
      if (!jobData.title?.trim()) errors.title = 'Job title is required'
      if (!jobData.department?.trim()) errors.department = 'Department is required'
      if (!jobData.location?.trim()) errors.location = 'Location is required'
      if (!jobData.deadline?.trim()) errors.deadline = 'Target date is required'
      break
    case 2:
      if (!jobData.description?.trim() || jobData.description === '<p></p>') errors.description = 'Job description is required'
      if (!jobData.responsibilities?.trim() || jobData.responsibilities === '<p></p>') errors.responsibilities = 'Requirements are required'
      break
    case 3:
      const totalWeight = (jobData.weightTechnical || 0) + (jobData.weightExperience || 0) +
        (jobData.weightScreening || 0) + (jobData.weightEducation || 0) +
        (jobData.weightCommunication || 0)
      if (totalWeight !== 100) errors.weights = `AI Score Weights must total 100% (currently ${totalWeight}%)`
      break
    case 5:
      const boards = jobData.selectedBoards || jobData.publishTargets || []
      if (boards.length === 0) errors.boards = 'Select at least one board to publish'
      break
  }
  return errors
}

export default function CreateJobPage() {
  const [step, setStep] = useState(1)
  const [job, setJob] = useState(DEFAULT_JOB)
  const [showDistribute, setShowDistribute] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const navigate = useNavigate()
  const createJob = useCreateJob()

  const updateJob = (updates) => {
    // Compute new state first to avoid stale closure
    const nextJob = { ...job, ...updates }
    setJob(nextJob)
    // Re-validate current step when data changes
    setErrors(prev => {
      const newErrors = validateStep(step, nextJob)
      return Object.keys(newErrors).length > 0 ? newErrors : {}
    })
  }

  const applyTemplate = (tpl) => {
    updateJob(tpl.data)
    setShowTemplates(false)
    toast.success(`"${tpl.name}" template applied`)
  }

  const nextStep = () => {
    const stepErrors = validateStep(step, job)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      setTouched(prev => ({ ...prev, ...Object.keys(stepErrors).reduce((a, k) => { a[k] = true; return a }, {}) }))

      // Shake the form
      const formEl = document.querySelector('.wizard-content')
      if (formEl) {
        formEl.classList.add('shake-animation')
        setTimeout(() => formEl.classList.remove('shake-animation'), 500)
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })

      toast.error('Please fill all required fields before continuing.', {
        duration: 4000,
        id: 'validation-error',
        style: { borderRadius: '8px' },
      })

      return
    }
    if (step < 6) {
      setErrors({})
      setStep(step + 1)
    }
  }

  const prevStep = () => { if (step > 1) setStep(step - 1) }

  const saveJob = async (status) => {
    if (createJob.isPending) return // Prevent double-fire
    if (!job.title.trim()) {
      toast.error('Job title is required')
      setStep(1)
      return
    }

    try {
      // Generate a job ID for the public apply link
      const jobId = 'job-' + Date.now().toString(36)
      const jobWithId = { ...job, id: jobId, status, postNow: status === 'live' }

      const created = await createJob.mutateAsync(jobWithId)
      
      if (status === 'live') {
        toast.success('Job posted successfully!')
        setJob(created || jobWithId)
        setShowDistribute(true)
      } else {
        toast.success('Job saved as draft')
        setTimeout(() => navigate('/jobs'), 600)
      }
    } catch (error) {
      // Still show distribute even if Supabase fails (demo mode)
      if (status === 'live') {
        const jobId = 'job-' + Date.now().toString(36)
        const jobWithId = { ...job, id: jobId, status: 'live' }
        setJob(jobWithId)
        toast.success('Job posted! (Demo mode)')
        setShowDistribute(true)
      } else {
        toast.error(error?.message || 'Unable to save job')
      }
    }
  }
  const saveDraft = () => saveJob('draft')
  const postJob = () => saveJob('live')

  const renderStep = () => {
    const props = { job, updateJob }
    switch (step) {
      case 1: return <StepBasicInfo {...props} errors={errors} />
      case 2: return <StepJobDetails {...props} />
      case 3: return <StepScreening {...props} errors={errors} />
      case 4: return <StepFormBuilder {...props} />
      case 5: return <StepPublish formData={job} onChange={(updates) => updateJob(updates)} />
      case 6: return (
          <StepReview
            formData={job}
            onBack={() => setStep(5)}
            onPublish={postJob}
            isPosting={createJob.isPending}
          />
        )
      default: return null
    }
  }

  return (
    <div className="create-job-page">
      <div className="create-job-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Create Job Opening -</h1>
          
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} onClick={() => setShowTemplates(v => !v)}>
              Choose a Job Template <ChevronDown size={14} style={{ marginLeft: 6 }} />
            </button>
            {showTemplates && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowTemplates(false)} />
                <div className="dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, minWidth: 240 }}>
                  {JOB_TEMPLATES.map(tpl => (
                    <button key={tpl.name} className="dropdown-item" onClick={() => applyTemplate(tpl)}>
                      <Briefcase size={14} /> {tpl.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>


      </div>

      {/* Step Progress */}
      <div className="wizard-progress">
        {STEPS.map((s) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <React.Fragment key={s.id}>
              <button
                className={`wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => setStep(s.id)}
              >
                <div className="wizard-step-icon">
                  {isDone ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className="wizard-step-label">{s.label}</span>
              </button>
              {s.id < 6 && <div className={`wizard-connector ${isDone ? 'done' : ''}`} />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="wizard-content"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="wizard-nav">
        <button className="btn btn-secondary" onClick={prevStep} disabled={step === 1}>
          <ArrowLeft size={16} /> Previous
        </button>
        <span className="wizard-nav-indicator">Step {step} of 6</span>
        {step < 6 ? (
          <button
            className="btn btn-primary"
            onClick={nextStep}
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          /* Post button is inside StepReview on the last step */
          <div />
        )}
      </div>

      {/* Board Publisher - shows after publishing */}
      {showDistribute && (
        <BoardPublisher
          job={job}
          selectedBoardIds={job.selectedBoards || job.publishTargets || []}
          onClose={() => { setShowDistribute(false); navigate('/jobs') }}
        />
      )}
    </div>
  )
}
