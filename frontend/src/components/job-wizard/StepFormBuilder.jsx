import React from 'react'
import { motion } from 'framer-motion'
import { Eye, GripVertical } from 'lucide-react'

const FORM_FIELD_GROUPS = [
  {
    title: 'Professional Links',
    fields: [
      { key: 'linkedin', label: 'LinkedIn Profile', description: 'Professional profile URL' },
      { key: 'portfolio', label: 'Portfolio Website', description: 'Personal or work portfolio' },
      { key: 'github', label: 'GitHub Profile', description: 'Code repository profile' },
      { key: 'behance', label: 'Behance / Dribbble', description: 'Design portfolio link' },
    ]
  },
  {
    title: 'Current Employment',
    fields: [
      { key: 'currentCompany', label: 'Current Company', description: 'Where they work now' },
      { key: 'currentTitle', label: 'Current Job Title', description: 'Current role designation' },
      { key: 'currentSalary', label: 'Current Salary', description: 'Current compensation (confidential)' },
      { key: 'expectedSalary', label: 'Expected Salary', description: 'Desired compensation range' },
      { key: 'noticePeriod', label: 'Notice Period', description: 'Time before they can join' },
      { key: 'workAuth', label: 'Work Authorization', description: 'Visa or work permit status' },
    ]
  },
  {
    title: 'Experience & Skills',
    fields: [
      { key: 'totalYears', label: 'Total Experience (Years)', description: 'Overall professional experience' },
      { key: 'industry', label: 'Industry', description: 'Domain or sector experience' },
      { key: 'domain', label: 'Functional Domain', description: 'Area of specialization' },
      { key: 'skillsTags', label: 'Skills Tags', description: 'Self-reported technical skills' },
      { key: 'education', label: 'Education Details', description: 'Degree, university, and year' },
      { key: 'certifications', label: 'Certifications', description: 'Professional certifications' },
      { key: 'languages', label: 'Languages Known', description: 'Communication languages' },
    ]
  },
  {
    title: 'Media & Documents',
    fields: [
      { key: 'profilePhoto', label: 'Profile Photo', description: 'Candidate headshot' },
      { key: 'videoIntro', label: 'Video Introduction', description: '60-second video pitch' },
      { key: 'coverLetter', label: 'Cover Letter', description: 'Written cover letter' },
      { key: 'personalStatement', label: 'Personal Statement', description: 'Short paragraph about themselves' },
    ]
  },
]

export default function StepFormBuilder({ job, updateJob }) {
  const formFields = job?.formFields || {}

  const toggleField = (key) => {
    updateJob({
      formFields: { ...formFields, [key]: !formFields[key] }
    })
  }

  const enabledCount = Object.values(formFields).filter(Boolean).length
  const totalFields = Object.keys(formFields).length

  return (
    <div className="step-form-builder">
      <div className="form-builder-header">
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>Application Form Builder</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            Choose which fields candidates need to fill out. Resume, Name, Email & Phone are always required.
          </p>
        </div>
        <div className="form-builder-count">
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>{enabledCount}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>of {totalFields} fields enabled</span>
        </div>
      </div>

      {/* Brand Settings */}
      <div className="form-brand-settings" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input
                type="color"
                value={job?.formBrandColor || '#6C5CE7'}
                onChange={(e) => updateJob({ formBrandColor: e.target.value })}
                style={{ width: 40, height: 36, padding: 2, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                {job?.formBrandColor || '#6C5CE7'}
              </span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Intro Message</label>
            <input
              type="text"
              placeholder="Welcome! Please fill out the form below..."
              value={job?.formIntroMessage || ''}
              onChange={(e) => updateJob({ formIntroMessage: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Field Groups */}
      <div className="field-groups">
        {FORM_FIELD_GROUPS.map((group, gi) => (
          <motion.div
            key={group.title}
            className="field-group"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06 }}
          >
            <h4 className="field-group-title">{group.title}</h4>
            <div className="field-toggles">
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  className={`field-toggle-row ${formFields[field.key] ? 'enabled' : ''}`}
                  onClick={() => toggleField(field.key)}
                >
                  <div className="field-toggle-grip">
                    <GripVertical size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                  </div>
                  <div className="field-toggle-info">
                    <span className="field-toggle-label">{field.label}</span>
                    <span className="field-toggle-desc">{field.description}</span>
                  </div>
                  <label className="toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!formFields[field.key]}
                      onChange={() => toggleField(field.key)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Always Required Banner */}
      <div className="always-required">
        <Eye size={16} style={{ color: 'var(--brand-primary-light)' }} />
        <span><strong>Always required:</strong> Full Name, Email, Phone Number, Resume Upload</span>
      </div>
    </div>
  )
}
