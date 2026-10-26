import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, CalendarClock, BellRing, UserX, Send, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { pipelineService, getAutopilotConfig } from '../../services/pipeline'

const TOGGLES = [
  { key: 'autoSchedule', label: 'Auto-schedule interviews', desc: 'Shortlisted → book + email join link', icon: CalendarClock },
  { key: 'autoReminders', label: '"Interview today" reminders', desc: 'Email candidates on the day', icon: BellRing },
  { key: 'autoReject', label: 'Auto-send declines', desc: 'Polite email when not shortlisted', icon: UserX },
  { key: 'autoSendOffer', label: 'Auto-send offers', desc: 'Off = draft + HR approval task', icon: Send },
]

export default function AutopilotWidget() {
  const [config, setConfig] = useState(getAutopilotConfig)
  const navigate = useNavigate()

  const toggle = (key) => setConfig(pipelineService.setAutopilotConfig({ [key]: !config[key] }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-info)', borderRadius: 16, padding: 20, marginBottom: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>Hiring Autopilot</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #a0a0cc)' }}>
            Every real application runs the chain: AI screen → shortlist → interview → analysis → offer
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/candidates')}>
          View candidates <ArrowRight size={14} />
        </button>
      </div>

      {/* Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {TOGGLES.map((t) => {
          const on = !!config[t.key]
          return (
            <button key={t.key} onClick={() => toggle(t.key)}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: on ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                border: '1px solid ' + (on ? 'var(--color-primary)' : 'var(--color-border)') }}>
              <t.icon size={16} color={on ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.label}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{t.desc}</span>
              </span>
              <span style={{ width: 34, height: 18, borderRadius: 10, flexShrink: 0, background: on ? 'var(--color-primary)' : '#CBD5E1', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
