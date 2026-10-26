import React, { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Check, Briefcase, MapPin, Clock, DollarSign, Users, FileText,
  Send, Eye, Edit3, ChevronDown, ChevronRight, Globe, AlertCircle,
  Sparkles, Star, CheckCircle2, ArrowRight
} from 'lucide-react'
import { JOB_BOARDS } from '../../data/jobBoardsData'

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'د.إ'
}

function formatSalary(min, max, currency, period) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency || ''
  const periodLabel = period === 'monthly' ? '/mo' : period === 'hourly' ? '/hr' : '/yr'

  // Format based on currency
  if (currency === 'INR') {
    // Indian format: ₹12.5L — ₹25L
    const minL = (min / 100000).toFixed(1)
    const maxL = (max / 100000).toFixed(1)
    return `₹${minL}L — ₹${maxL}L${periodLabel}`
  }

  // International format: $120k — $180k (abbreviated)
  const minK = min >= 1000 ? `${(min / 1000).toFixed(0)}k` : min
  const maxK = max >= 1000 ? `${(max / 1000).toFixed(0)}k` : max
  return `${symbol}${minK} — ${symbol}${maxK}${periodLabel}`
}

export default function StepReview({ formData = {}, onBack, onPublish, isPosting = false }) {
  const [agreed, setAgreed] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    basic: true, details: true, screening: true, publishing: true
  })

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedBoards = formData.selectedBoards || []
  const boardDetails = selectedBoards.map(id => JOB_BOARDS.find(b => b.id === id)).filter(Boolean)

  const completionChecks = [
    { label: 'Job title provided', done: !!formData.title },
    { label: 'Department selected', done: !!formData.department },
    { label: 'Location specified', done: !!formData.location },
    { label: 'Job description written', done: !!formData.description },
    { label: 'At least one skill added', done: formData.skills?.length > 0 },
    { label: 'Salary range defined', done: formData.salaryMin > 0 },
    { label: 'Job boards selected', done: selectedBoards.length > 0 },
  ]
  const completionPercent = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100)

  return (
    <div className="step-review">
      {/* Completion Score */}
      <motion.div
        className="review-completion-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="completion-ring-container">
          <svg viewBox="0 0 100 100" className="completion-ring">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-elevated)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke={completionPercent >= 80 ? 'var(--brand-success)' : completionPercent >= 50 ? 'var(--brand-warning)' : 'var(--brand-danger)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${completionPercent * 2.64} ${264 - completionPercent * 2.64}`}
              strokeDashoffset="66"
              initial={{ strokeDasharray: '0 264' }}
              animate={{ strokeDasharray: `${completionPercent * 2.64} ${264 - completionPercent * 2.64}` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </svg>
          <span className="completion-percent">{completionPercent}%</span>
        </div>
        <div className="completion-details">
          <h4 style={{ fontWeight: 700 }}>Job Posting Readiness</h4>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            {completionPercent === 100 ? '✨ Perfect! Your job posting is ready to go live.' :
             completionPercent >= 80 ? 'Almost there! A few optional fields remain.' :
             'Complete the required fields before publishing.'}
          </p>
          <div className="completion-checklist">
            {completionChecks.map((check, i) => (
              <div key={i} className={`completion-check-item ${check.done ? 'done' : 'pending'}`}>
                {check.done ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Review Sections */}
      <div className="review-sections">
        {/* Basic Info */}
        <div className="review-section">
          <button className="review-section-header" onClick={() => toggleSection('basic')}>
            <div className="review-section-title">
              <Briefcase size={16} />
              <span>Basic Information</span>
            </div>
            {expandedSections.basic ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.basic && (
            <motion.div
              className="review-section-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="review-grid">
                <ReviewField label="Job Title" value={formData.title || 'Not set'} />
                <ReviewField label="Department" value={formData.department || 'Not set'} />
                <ReviewField label="Location" value={formData.location || 'Not set'} />
                <ReviewField label="Work Mode" value={formData.workMode || 'Not set'} />
                <ReviewField label="Job Type" value={formData.type || formData.jobType || 'Not set'} />
                <ReviewField label="Openings" value={formData.openings || '1'} />
                <ReviewField label="Priority" value={formData.priority || 'Normal'} />
                <ReviewField label="Hiring Manager" value={formData.hiringManager || 'Not assigned'} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Job Details */}
        <div className="review-section">
          <button className="review-section-header" onClick={() => toggleSection('details')}>
            <div className="review-section-title">
              <FileText size={16} />
              <span>Job Details & Compensation</span>
            </div>
            {expandedSections.details ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.details && (
            <motion.div
              className="review-section-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="review-grid">
                <ReviewField
                  label="Salary Range"
                  value={formData.salaryMin && formData.salaryMax
                    ? formatSalary(formData.salaryMin, formData.salaryMax, formData.currency, formData.salaryPeriod)
                    : 'Not set'}
                />
                <ReviewField
                  label="Experience"
                  value={formData.experienceMin !== undefined
                    ? `${formData.experienceMin} — ${formData.experienceMax || 'Any'} years`
                    : 'Not set'}
                />
              </div>
              {formData.skills?.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <span className="review-field-label">Skills Required</span>
                  <div className="review-skills">
                    {formData.skills.map(skill => (
                      <span key={skill} className="review-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {formData.description && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <span className="review-field-label">Job Description</span>
                  <div className="review-description-preview">
                    {formData.description.substring(0, 200)}{formData.description.length > 200 ? '...' : ''}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Screening Questions */}
        <div className="review-section">
          <button className="review-section-header" onClick={() => toggleSection('screening')}>
            <div className="review-section-title">
              <Sparkles size={16} />
              <span>Screening Questions</span>
              <span className="badge badge-primary" style={{ marginLeft: 'var(--space-2)' }}>
                {formData.screeningQuestions?.length || 0}
              </span>
            </div>
            {expandedSections.screening ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.screening && (
            <motion.div
              className="review-section-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {formData.screeningQuestions?.length > 0 ? (
                <div className="review-questions-list">
                  {formData.screeningQuestions.map((q, i) => (
                    <div key={i} className="review-question-item">
                      <span className="review-question-num">Q{i + 1}</span>
                      <div>
                        <span className="review-question-text">{q.text}</span>
                        <span className="review-question-type">{q.type} {q.required ? '• Required' : '• Optional'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="review-empty-note">No screening questions added. AI will use default evaluation criteria.</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Publishing */}
        <div className="review-section">
          <button className="review-section-header" onClick={() => toggleSection('publishing')}>
            <div className="review-section-title">
              <Globe size={16} />
              <span>Publishing</span>
              <span className="badge badge-accent" style={{ marginLeft: 'var(--space-2)' }}>
                {selectedBoards.length} boards
              </span>
            </div>
            {expandedSections.publishing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.publishing && (
            <motion.div
              className="review-section-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="review-boards-list">
                {boardDetails.map(board => (
                  <div key={board.id} className="review-board-item">
                    <span className="review-board-logo" style={{ color: board.color }}>{board.logo}</span>
                    <span className="review-board-name">{board.name}</span>
                    <span className="review-board-reach">{board.avgReach}</span>
                  </div>
                ))}
              </div>
              <div className="review-grid" style={{ marginTop: 'var(--space-3)' }}>
                <ReviewField label="Schedule" value={formData.scheduleType === 'schedule' ? formData.scheduleDate : 'Immediately'} />
                <ReviewField label="Auto-expiry" value={formData.autoExpiry ? `${formData.autoExpiry} days` : '30 days'} />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Agreement */}
      <label className="review-agree" onClick={() => setAgreed(!agreed)}>
        <div className={`board-checkbox ${agreed ? 'checked' : ''}`}>
          {agreed && <Check size={14} />}
        </div>
        <span>
          I confirm that this job posting complies with our company's equal employment opportunity policy
          and all applicable laws.
        </span>
      </label>

      {/* Publish CTA */}
      <motion.div className="review-cta">
        <button className="btn btn-secondary btn-lg" onClick={onBack}>
          <Edit3 size={16} /> Edit Posting
        </button>
        <button
          className="btn btn-primary btn-lg review-publish-btn"
          onClick={() => {
            if (isPosting) return
            if (!agreed) {
              toast.error('Please check the agreement checkbox above before publishing.', { duration: 3000 })
              return
            }
            if (completionPercent < 15) {
              toast.error('Please fill more required fields before publishing.', { duration: 3000 })
              return
            }
            onPublish()
          }}
          disabled={isPosting}
          style={{ opacity: isPosting ? 0.7 : 1, cursor: isPosting ? 'not-allowed' : 'pointer' }}
        >
          <Send size={16} />
          {isPosting ? 'Saving...' : (formData.scheduleType === 'schedule' ? 'Schedule Publishing' : 'Publish Now')}
          {!isPosting && <ArrowRight size={16} />}
        </button>
      </motion.div>
    </div>
  )
}

function ReviewField({ label, value }) {
  return (
    <div className="review-field">
      <span className="review-field-label">{label}</span>
      <span className="review-field-value">{value}</span>
    </div>
  )
}
