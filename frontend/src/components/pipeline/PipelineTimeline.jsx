import React from 'react'
import { motion } from 'framer-motion'
import { PIPELINE_STAGES } from '../../services/pipeline'

const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, s]))

const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const isTerminal = (key) => key === 'offer' || key === 'hired'
const isReject = (key) => key === 'rejected'

/**
 * Renders a candidate's autopilot journey from candidate.pipelineTimeline.
 * @param {Array<{stage:string, detail:string, at:string}>} timeline
 */
export default function PipelineTimeline({ timeline = [], compact = false }) {
  if (!timeline.length) {
    return <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No autopilot activity yet.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 2 : 4 }}>
      {timeline.map((entry, i) => {
        const stage = STAGE_MAP[entry.stage] || { label: entry.stage, icon: '•' }
        const last = i === timeline.length - 1
        const accent = isReject(entry.stage) ? '#FF6B6B' : isTerminal(entry.stage) ? '#00B894' : '#6C5CE7'
        return (
          <motion.div
            key={`${entry.stage}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
          >
            {/* Rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${accent}22`, border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                {stage.icon}
              </div>
              {!last && <div style={{ width: 2, flex: 1, minHeight: compact ? 14 : 20, background: 'linear-gradient(var(--border-default, rgba(255,255,255,0.12)), transparent)' }} />}
            </div>
            {/* Content */}
            <div style={{ paddingBottom: compact ? 8 : 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary, #fff)' }}>{stage.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary, #777)' }}>{fmtTime(entry.at)}</span>
              </div>
              {entry.detail && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #a0a0cc)' }}>{entry.detail}</span>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
