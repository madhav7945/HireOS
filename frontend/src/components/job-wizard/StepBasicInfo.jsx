import React from 'react'
import { useCustomFields } from '../../hooks/useCustomFields'

const REQUIRED_MARK = <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>

export default function StepBasicInfo({ job, updateJob, errors = {} }) {
  const { fields: jobCustomFields } = useCustomFields('jobs')
  const setCustom = (key, value) => updateJob({ custom: { ...(job.custom || {}), [key]: value } })

  const inputStyle = (field) => ({
    flex: 1,
    padding: '6px 12px',
    height: '32px',
    fontSize: '14px',
    fontFamily: 'inherit',
    background: errors[field] ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-input)',
    border: `1px solid ${errors[field] ? '#EF4444' : 'var(--border-default)'}`,
    borderRadius: '4px',
    color: 'var(--text-primary)',
  })

  const selectStyle = (field) => ({
    flex: 1,
    padding: '6px 12px',
    height: '32px',
    fontSize: '14px',
    fontFamily: 'inherit',
    background: errors[field] ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-input)',
    border: `1px solid ${errors[field] ? '#EF4444' : 'var(--border-default)'}`,
    borderRadius: '4px',
    color: 'var(--text-primary)',
  })

  return (
    <div className="zoho-form-container" style={{ padding: '24px 0' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
        Job Opening Information
      </h2>

      <div className="zoho-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>

        {/* Left Column */}
        <div className="zoho-form-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <FormRow label="Job Opening ID" disabled>
            <input type="text" style={{ ...inputStyle(), background: 'var(--surface-elevated)', color: 'var(--text-tertiary)' }}
              value={job.id || 'Auto-generated'} disabled />
          </FormRow>

          <FormRow label="Posting Title" required error={errors?.title}>
            <input type="text" style={inputStyle('title')}
              value={job.title || ''} onChange={e => updateJob({ title: e.target.value })} />
          </FormRow>

          <FormRow label="Department" required error={errors?.department}>
            <select style={selectStyle('department')}
              value={job.department || ''} onChange={e => updateJob({ department: e.target.value })}>
              <option value="">- Select Department -</option>
              <option value="Engineering">Engineering</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Design">Design</option>
              <option value="Product Management">Product Management</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Business Development">Business Development</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Legal">Legal</option>
              <option value="Operations">Operations</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Research & Development">Research & Development</option>
              <option value="Security">Security</option>
              <option value="DevOps">DevOps</option>
              <option value="Data & AI">Data & AI</option>
              <option value="Consulting">Consulting</option>
              <option value="Training & Development">Training & Development</option>
              <option value="Executive">Executive</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Construction">Construction</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Retail">Retail</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Administrative">Administrative</option>
            </select>
          </FormRow>

          <FormRow label="Location" required error={errors?.location}>
            <input type="text" style={inputStyle('location')}
              placeholder="e.g. Bangalore, Remote, New York"
              value={job.location || ''} onChange={e => updateJob({ location: e.target.value })} />
          </FormRow>

          <FormRow label="Target Date" required error={errors?.deadline}>
            <input type="date" style={inputStyle('deadline')}
              value={job.deadline || ''} onChange={e => updateJob({ deadline: e.target.value })} />
          </FormRow>

          <FormRow label="Job Type">
            <select style={selectStyle('jobType')}
              value={job.jobType || 'Full-time'} onChange={e => updateJob({ jobType: e.target.value })}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </FormRow>

        </div>

        {/* Right Column */}
        <div className="zoho-form-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <FormRow label="Hiring Manager">
            <input type="text" style={inputStyle('hiringManager')}
              placeholder="e.g. Vikram Patel"
              value={job.hiringManager || ''} onChange={e => updateJob({ hiringManager: e.target.value })} />
          </FormRow>

          <FormRow label="No. of Positions">
            <input type="number" min={1} max={999} style={inputStyle('openings')}
              value={job.openings || 1} onChange={e => updateJob({ openings: parseInt(e.target.value) || 1 })} />
          </FormRow>

          <FormRow label="Work Mode">
            <select style={selectStyle('workMode')}
              value={job.workMode || 'On-site'} onChange={e => updateJob({ workMode: e.target.value })}>
              <option>On-site</option>
              <option>Remote</option>
              <option>Hybrid</option>
            </select>
          </FormRow>

          <FormRow label="Priority">
            <select style={selectStyle('priority')}
              value={job.priority || 'Normal'} onChange={e => updateJob({ priority: e.target.value })}>
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </FormRow>

        </div>
      </div>

      {/* Salary Section */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '32px 0 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        Compensation
      </h3>
      <div className="zoho-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
        <div className="zoho-form-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormRow label="Min Salary">
            <input type="number" style={inputStyle('salaryMin')}
              placeholder="e.g. 500000"
              value={job.salaryMin || ''} onChange={e => updateJob({ salaryMin: e.target.value })} />
          </FormRow>
          <FormRow label="Max Salary">
            <input type="number" style={inputStyle('salaryMax')}
              placeholder="e.g. 1200000"
              value={job.salaryMax || ''} onChange={e => updateJob({ salaryMax: e.target.value })} />
          </FormRow>
        </div>
        <div className="zoho-form-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormRow label="Currency">
            <select style={selectStyle('currency')}
              value={job.currency || 'INR'} onChange={e => updateJob({ currency: e.target.value })}>
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="CAD">CAD (Canadian Dollar)</option>
              <option value="AUD">AUD (Australian Dollar)</option>
              <option value="SGD">SGD (Singapore Dollar)</option>
              <option value="AED">AED (UAE Dirham)</option>
            </select>
          </FormRow>
          <FormRow label="Period">
            <select style={selectStyle('salaryPeriod')}
              value={job.salaryPeriod || 'yearly'} onChange={e => updateJob({ salaryPeriod: e.target.value })}>
              <option value="yearly">Per Year</option>
              <option value="monthly">Per Month</option>
              <option value="hourly">Per Hour</option>
            </select>
          </FormRow>
        </div>
      </div>

      {/* Experience */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '32px 0 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        Experience Requirements
      </h3>
      <div className="zoho-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
        <FormRow label="Min Experience (years)">
          <select style={selectStyle('experienceMin')}
            value={job.experienceMin ?? 0} onChange={e => updateJob({ experienceMin: parseInt(e.target.value) })}>
            {[0,1,2,3,4,5,6,7,8,9,10,12,15,20].map(y => (
              <option key={y} value={y}>{y} {y === 1 ? 'year' : 'years'}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Max Experience (years)">
          <select style={selectStyle('experienceMax')}
            value={job.experienceMax ?? 5} onChange={e => updateJob({ experienceMax: parseInt(e.target.value) })}>
            {[1,2,3,4,5,6,7,8,9,10,12,15,20,25,30].map(y => (
              <option key={y} value={y}>{y} {y === 1 ? 'year' : 'years'}</option>
            ))}
          </select>
        </FormRow>
      </div>

      {/* Custom Fields */}
      {jobCustomFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '32px 0 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            Custom Fields
          </h3>
          <div className="zoho-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
            {jobCustomFields.map(cf => (
              <div className="zoho-form-row" style={{ display: 'flex', alignItems: 'center' }} key={cf.key}>
                <label style={{ width: '180px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right', paddingRight: '16px' }}>
                  {cf.label}{cf.required ? ' *' : ''}
                </label>
                {cf.type === 'select' ? (
                  <select style={inputStyle(cf.key)} value={job.custom?.[cf.key] || ''} onChange={e => setCustom(cf.key, e.target.value)}>
                    <option value="">Select...</option>
                    {(cf.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : cf.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!job.custom?.[cf.key]} onChange={e => setCustom(cf.key, e.target.checked)} />
                ) : (
                  <input type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'} style={inputStyle(cf.key)} value={job.custom?.[cf.key] || ''} onChange={e => setCustom(cf.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

function FormRow({ label, children, required, error, disabled, hint }) {
  return (
    <div className="zoho-form-row" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <label style={{ width: '180px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right', paddingRight: '16px', paddingTop: '6px', flexShrink: 0, lineHeight: '32px' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
        {hint && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{hint}</span>}
        {error && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 2 }}>{error}</span>}
      </div>
    </div>
  )
}
