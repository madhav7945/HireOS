import React, { useState } from 'react'
import {
  Plus, Trash2, Sliders, Sparkles, Check, AlertCircle,
  Code2, Briefcase, FileCheck, GraduationCap, MessageSquare,
  ShieldAlert, Trophy, Award, SlidersHorizontal, HelpCircle,
  CheckCircle2, ChevronRight, Wand2
} from 'lucide-react'

const QUESTION_TYPES = [
  'Yes/No', 'Multiple Choice', 'Short Text', 'Long Text', 'Rating Scale', 'Number', 'Date', 'File Upload'
]

const WEIGHT_CONFIG = [
  { key: 'weightTechnical', label: 'Technical Skills', icon: Code2, color: '#6366f1', desc: 'Code quality, algorithms, system architecture' },
  { key: 'weightExperience', label: 'Work Experience', icon: Briefcase, color: '#6366f1', desc: 'Years in industry, previous employers & seniority' },
  { key: 'weightScreening', label: 'Screening Answers', icon: FileCheck, color: '#6366f1', desc: 'Questionnaire responses & role criteria' },
  { key: 'weightEducation', label: 'Education & Degree', icon: GraduationCap, color: '#6366f1', desc: 'University, certifications, coursework' },
  { key: 'weightCommunication', label: 'Communication Fit', icon: MessageSquare, color: '#6366f1', desc: 'Articulation, conciseness, verbal clarity' },
]

const PRESETS = [
  {
    name: 'Balanced',
    weights: { weightTechnical: 20, weightExperience: 20, weightScreening: 20, weightEducation: 20, weightCommunication: 20 }
  },
  {
    name: 'Tech & Code Heavy',
    weights: { weightTechnical: 45, weightExperience: 25, weightScreening: 10, weightEducation: 10, weightCommunication: 10 }
  },
  {
    name: 'Experience & Seniority',
    weights: { weightTechnical: 30, weightExperience: 40, weightScreening: 10, weightEducation: 10, weightCommunication: 10 }
  },
  {
    name: 'Leadership & Client Fit',
    weights: { weightTechnical: 25, weightExperience: 20, weightScreening: 15, weightEducation: 10, weightCommunication: 30 }
  }
]

const QUESTION_TEMPLATES = [
  { text: 'Do you have unrestricted authorization to work in this location?', type: 'Yes/No', autoDisqualify: 'No', required: true, idealAnswer: 'Yes' },
  { text: 'How many years of professional experience do you have with our primary tech stack?', type: 'Number', autoDisqualify: 'min:2', required: true, idealAnswer: '3+' },
  { text: 'What is your current notice period / availability to start?', type: 'Multiple Choice', autoDisqualify: '>90 days', required: true, idealAnswer: 'Immediate to 30 days' },
  { text: 'What are your expected annual compensation (CTC) expectations?', type: 'Short Text', autoDisqualify: '', required: false, idealAnswer: 'Within budget' },
]

function RangeSlider({ min = 0, max = 100, step = 1, value = 0, onChange, color = 'var(--brand-primary, #6366f1)' }) {
  const numVal = typeof value === 'number' ? value : (parseInt(value, 10) || 0)
  const safeVal = Math.min(Math.max(numVal, min), max)
  const pct = max > min ? Math.max(0, Math.min(100, ((safeVal - min) / (max - min)) * 100)) : 0
  
  // Thumb width is 16px (radius 8px). The center moves from 8px to (width - 8px).
  const thumbRadius = 8
  const offset = thumbRadius - (2 * thumbRadius * (pct / 100))
  const fillWidth = `calc(${pct}% + ${offset.toFixed(2)}px)`

  return (
    <div className="custom-slider-container">
      <div className="custom-slider-track-bg" />
      <div
        className="custom-slider-track-fill"
        style={{
          width: fillWidth,
          backgroundColor: color
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeVal}
        onChange={onChange}
        className="custom-slider-input"
      />
    </div>
  )
}

export default function StepScreening({ job, updateJob, errors = {} }) {
  const [activePreset, setActivePreset] = useState(null)

  const addQuestion = (template = null) => {
    const newQ = template ? {
      id: Date.now() + Math.random(),
      text: template.text,
      type: template.type,
      required: template.required,
      autoDisqualify: template.autoDisqualify,
      idealAnswer: template.idealAnswer,
      weight: 'Medium'
    } : {
      id: Date.now(),
      text: '',
      type: 'Short Text',
      required: true,
      autoDisqualify: '',
      idealAnswer: '',
      weight: 'Medium'
    }

    updateJob({
      screeningQuestions: [...job.screeningQuestions, newQ]
    })
  }

  const updateQuestion = (id, field, value) => {
    updateJob({
      screeningQuestions: job.screeningQuestions.map(q =>
        q.id === id ? { ...q, [field]: value } : q
      )
    })
  }

  const removeQuestion = (id) => {
    updateJob({ screeningQuestions: job.screeningQuestions.filter(q => q.id !== id) })
  }

  // Weight Calculations
  const totalWeight = (job.weightTechnical || 0) + (job.weightExperience || 0) +
    (job.weightScreening || 0) + (job.weightEducation || 0) +
    (job.weightCommunication || 0)
  const weightOk = totalWeight === 100

  // Apply Preset
  const applyPreset = (preset) => {
    setActivePreset(preset.name)
    updateJob(preset.weights)
  }

  // Smart Auto-Balance Weights to 100%
  const autoBalanceWeights = () => {
    const keys = WEIGHT_CONFIG.map(w => w.key)
    const currentValues = keys.map(k => Math.max(1, job[k] || 0))
    const currentSum = currentValues.reduce((a, b) => a + b, 0)
    
    let remainder = 100
    const newWeights = {}
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        newWeights[k] = remainder
      } else {
        const normalized = Math.round((currentValues[idx] / currentSum) * 100)
        newWeights[k] = normalized
        remainder -= normalized
      }
    })
    updateJob(newWeights)
    setActivePreset(null)
  }

  // Step Weight adjustment
  const adjustWeight = (key, delta) => {
    const current = job[key] || 0
    const next = Math.max(0, Math.min(100, current + delta))
    updateJob({ [key]: next })
    setActivePreset(null)
  }

  return (
    <div className="step-screening-container">
      <div className="wizard-step-header">
        <h2 className="wizard-section-title" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px' }}>
          Step 3 — AI Screening &amp; Evaluation Setup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Configure AI scoring weights, automatic shortlisting thresholds, and knockout qualification rules.
        </p>
      </div>

      {/* SECTION 1: AI SCORING WEIGHT DISTRIBUTION */}
      <div className="wizard-card-box">
        <div className="wizard-box-header">
          <div>
            <h3 className="wizard-box-title">
              <Sliders size={18} style={{ color: '#8b5cf6' }} /> AI Score Weights (Must Total 100%)
            </h3>
            <p className="wizard-box-desc">
              Define how the AI calculates the overall candidate match fit.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`weight-total-pill ${weightOk ? 'valid' : 'invalid'}`}>
              <span>Total: <strong>{totalWeight}%</strong></span>
              {weightOk ? <Check size={13} /> : <AlertCircle size={13} />}
            </div>
            {!weightOk && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={autoBalanceWeights}
                title="Automatically normalize sliders to 100%"
              >
                <Wand2 size={12} /> Auto-Balance to 100%
              </button>
            )}
          </div>
        </div>



        {/* 1-Click Preset Templates */}
        <div className="weight-presets-bar">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Quick Presets:
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`preset-chip-btn ${activePreset === p.name ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Individual Interactive Weight Sliders */}
        <div className="weights-grid-list">
          {WEIGHT_CONFIG.map(({ key, label, icon: Icon, color, desc }) => {
            const val = job[key] || 0
            return (
              <div key={key} className="weight-slider-card">
                <div className="weight-slider-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="weight-icon-badge" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="weight-label">{label}</span>
                      <span className="weight-desc">{desc}</span>
                    </div>
                  </div>

                  <div className="weight-stepper-control">
                    <button
                      type="button"
                      className="weight-step-btn"
                      onClick={() => adjustWeight(key, -5)}
                      disabled={val <= 0}
                    >
                      -5%
                    </button>
                    <span className="weight-numeric-badge" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {val}%
                    </span>
                    <button
                      type="button"
                      className="weight-step-btn"
                      onClick={() => adjustWeight(key, +5)}
                      disabled={val >= 100}
                    >
                      +5%
                    </button>
                  </div>
                </div>

                <RangeSlider
                  min={0}
                  max={100}
                  step={5}
                  value={val}
                  onChange={(e) => {
                    updateJob({ [key]: parseInt(e.target.value) || 0 })
                    setActivePreset(null)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 2: AI THRESHOLDS & DECISION SPECTRUM */}
      <div className="wizard-card-box">
        <div className="wizard-box-header">
          <div>
            <h3 className="wizard-box-title">
              <Award size={18} style={{ color: '#6366f1' }} /> AI Screening &amp; Auto-Advance Thresholds
            </h3>
            <p className="wizard-box-desc">
              Configure score gates to automatically fast-track top applicants or filter out disqualified candidates.
            </p>
          </div>
        </div>

        {/* Visual 3-Zone Spectrum Bar */}
        <div className="decision-spectrum-card">
          <div className="spectrum-header">
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DECISION ZONES</span>
          </div>

          <div className="spectrum-track">
            {/* Red Auto Reject Zone */}
            <div
              className="spectrum-zone reject"
              style={{ width: `${job.autoRejectEnabled ? (job.autoRejectBelow || 40) : 0}%` }}
            >
              {job.autoRejectEnabled && (job.autoRejectBelow || 40) >= 20 && <span>Auto-Reject</span>}
            </div>

            {/* Yellow Review Zone */}
            <div
              className="spectrum-zone review"
              style={{
                width: `${(job.shortlistThreshold || 80) - (job.autoRejectEnabled ? (job.autoRejectBelow || 40) : 0)}%`
              }}
            >
              <span>Human Review &amp; Rank</span>
            </div>

            {/* Green Auto Shortlist Zone */}
            <div
              className="spectrum-zone shortlist"
              style={{ width: `${100 - (job.shortlistThreshold || 80)}%` }}
            >
              <span>Auto-Shortlist ★</span>
            </div>
          </div>

          <div className="spectrum-legend">
            <div className="legend-item red">
              <span className="dot" /> Auto-Reject Below: <strong>{job.autoRejectEnabled ? `${job.autoRejectBelow || 40}%` : 'Disabled'}</strong>
            </div>
            <div className="legend-item yellow">
              <span className="dot" /> Shortlist Floor: <strong>≥ {job.shortlistScoreFloor || 70}%</strong>
            </div>
            <div className="legend-item green">
              <span className="dot" /> Fast-Track Shortlist: <strong>≥ {job.shortlistThreshold || 80}%</strong>
            </div>
          </div>
        </div>

        <div className="thresholds-controls-grid">
          {/* Threshold 1: Shortlist Threshold */}
          <div className="threshold-input-card">
            <div className="threshold-card-top">
              <div>
                <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                  Fast-Track Shortlist Score
                </label>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Candidates scoring at or above this score are marked recommended.
                </p>
              </div>
              <span className="threshold-pill-val" style={{ color: '#6366f1', fontWeight: 600 }}>≥ {job.shortlistThreshold}%</span>
            </div>

            <div style={{ marginTop: 10 }}>
              <RangeSlider
                min={50}
                max={95}
                value={job.shortlistThreshold || 80}
                onChange={(e) => updateJob({ shortlistThreshold: parseInt(e.target.value) || 50 })}
              />
            </div>
          </div>

          {/* Threshold 2: Auto Reject */}
          <div className="threshold-input-card">
            <div className="threshold-card-top">
              <div>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Auto-Reject Below
                  <label className="toggle" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={job.autoRejectEnabled}
                      onChange={(e) => updateJob({ autoRejectEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </label>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Automatically send polite rejection email to candidates below floor.
                </p>
              </div>
              {job.autoRejectEnabled && (
                <span className="threshold-pill-val" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>&lt; {job.autoRejectBelow}%</span>
              )}
            </div>

            {job.autoRejectEnabled && (
              <div style={{ marginTop: 10 }}>
                <RangeSlider
                  min={10}
                  max={60}
                  value={job.autoRejectBelow || 40}
                  onChange={(e) => updateJob({ autoRejectBelow: parseInt(e.target.value) || 10 })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: BIG-TECH TOP-N METHODOLOGY */}
      <div className="wizard-card-box">
        <div className="wizard-box-header">
          <div>
            <h3 className="wizard-box-title">
              <Trophy size={18} style={{ color: '#6366f1' }} /> Top-N Pool Ranking &amp; Shortlist Size
            </h3>
            <p className="wizard-box-desc">
              Every applicant is scored and ranked relative to each other. The top N candidates are recommended for final human interview.
            </p>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Recommended Shortlist Size (Top N)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[3, 5, 10, 25].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-xs ${job.shortlistSize === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => updateJob({ shortlistSize: n })}
                >
                  Top {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={500}
              value={job.shortlistSize}
              onChange={(e) => updateJob({ shortlistSize: parseInt(e.target.value) || 1 })}
              placeholder="e.g. 5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Score Floor Guardrail (Must also clear ≥)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1 }}>
                <RangeSlider
                  min={40}
                  max={90}
                  value={job.shortlistScoreFloor || 70}
                  onChange={(e) => updateJob({ shortlistScoreFloor: parseInt(e.target.value) || 40 })}
                />
              </div>
              <span className="slider-value" style={{ minWidth: 42, color: 'var(--text-primary)', fontWeight: 600 }}>
                {job.shortlistScoreFloor || 70}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: KNOCKOUT REQUIREMENTS */}
      <div className="wizard-card-box">
        <div className="wizard-box-header">
          <div>
            <h3 className="wizard-box-title">
              <ShieldAlert size={18} style={{ color: 'var(--text-secondary)' }} /> Knockout Filters (Hard Pass / Fail)
            </h3>
            <p className="wizard-box-desc">
              Objective, non-negotiable requirements. Applicants who fail any knockout rule are immediately disqualified.
            </p>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Minimum Work Experience (Years)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={job.experienceMin}
              onChange={(e) => updateJob({ experienceMin: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label className="form-label">Work Authorization Verification</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <label className="toggle" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={!!job.requireWorkAuth}
                  onChange={(e) => updateJob({ requireWorkAuth: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                Require Valid Local Work Authorization
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: SCREENING QUESTIONNAIRE */}
      <div className="wizard-card-box">
        <div className="wizard-box-header">
          <div>
            <h3 className="wizard-box-title">
              <FileCheck size={18} style={{ color: '#38bdf8' }} /> Custom Screening Questions ({job.screeningQuestions.length}/20)
            </h3>
            <p className="wizard-box-desc">
              Add specific application questions. Candidates answer these during application submission.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => addQuestion()}
            disabled={job.screeningQuestions.length >= 20}
          >
            <Plus size={14} /> Add Custom Question
          </button>
        </div>

        {/* Quick Question Template Chips */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 6 }}>
            Quick Template Questions:
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {QUESTION_TEMPLATES.map((t) => (
              <button
                key={t.text}
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => addQuestion(t)}
                style={{ fontSize: '0.75rem' }}
              >
                + {t.text.slice(0, 36)}...
              </button>
            ))}
          </div>
        </div>

        {/* Question Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {job.screeningQuestions.map((q, i) => (
            <div key={q.id} className="screening-question-card">
              <div className="screening-question-header">
                <span className="screening-question-num">Q{i + 1}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    value={q.weight}
                    onChange={(e) => updateQuestion(q.id, 'weight', e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    <option value="Low">Low Weight</option>
                    <option value="Medium">Medium Weight</option>
                    <option value="High">High Weight</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => removeQuestion(q.id)}
                    title="Delete question"
                  >
                    <Trash2 size={14} style={{ color: 'var(--brand-danger)' }} />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                placeholder="Type screening question prompt..."
                style={{ width: '100%', marginBottom: 10, fontWeight: 600 }}
              />

              <div className="form-row" style={{ alignItems: 'center' }}>
                <div className="form-group" style={{ flex: 2, margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Ideal Expected Answer (Internal Guidance)</label>
                  <input
                    type="text"
                    value={q.idealAnswer}
                    onChange={(e) => updateQuestion(q.id, 'idealAnswer', e.target.value)}
                    placeholder="e.g. Yes / 3+ Years / Bachelor's degree"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div className="form-group" style={{ flex: 2, margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Knockout Auto-Disqualify Rule</label>
                  <input
                    type="text"
                    value={q.autoDisqualify}
                    onChange={(e) => updateQuestion(q.id, 'autoDisqualify', e.target.value)}
                    placeholder={q.type === 'Number' ? 'min:3 (rejects below 3)' : q.type === 'Yes/No' ? 'No (rejects if No)' : 'Exact disqualifying answer'}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <label className="checkbox-item" style={{ border: 'none', padding: 0, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                    />
                    Required
                  </label>
                </div>
              </div>
            </div>
          ))}

          {job.screeningQuestions.length === 0 && (
            <div className="empty-state" style={{ padding: 28, textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No custom questions added yet. Use template buttons above or click "Add Custom Question".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
