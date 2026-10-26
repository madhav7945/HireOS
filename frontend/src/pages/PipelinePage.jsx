import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, MoreHorizontal, GripVertical, ChevronDown } from 'lucide-react'
import { PIPELINE_STAGES, DEMO_CANDIDATES } from '../data/mockData'
import { avatarColor } from '../utils/avatar'
import Skeleton from '../components/ui/Skeleton'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import './PipelinePage.css'

// Map candidates to stages
const STAGE_CANDIDATES = {
  'applied': [
    { id: 'c1', name: 'Ravi Kumar', role: 'Sr. React Dev', score: 78, time: '2h ago' },
    { id: 'c2', name: 'Deepa Nair', role: 'Product Designer', score: 82, time: '4h ago' },
    { id: 'c3', name: 'Arun Mehta', role: 'DevOps Engineer', score: 65, time: '6h ago' },
  ],
  'screening': [
    { id: 'c4', name: 'Sneha Reddy', role: 'Data Scientist', score: 74, time: '1d ago' },
    { id: 'c5', name: 'Vikash Singh', role: 'Sr. React Dev', score: 80, time: '1d ago' },
  ],
  'shortlisted': [
    { id: 'c6', name: 'Ananya Iyer', role: 'DevOps Engineer', score: 82, time: '2d ago' },
    { id: 'c7', name: 'Neha Gupta', role: 'Data Scientist', score: 79, time: '3d ago' },
  ],
  'ai-interview-sent': [
    { id: 'c8', name: 'Pooja Desai', role: 'Product Designer', score: 86, time: '1d ago' },
  ],
  'ai-interview-complete': [
    { id: 'c9', name: 'Arjun Patel', role: 'Sr. React Dev', score: 92, time: '12h ago' },
    { id: 'c10', name: 'Siddharth J.', role: 'Mobile Dev', score: 90, time: '1d ago' },
  ],
  'hr-review': [
    { id: 'c11', name: 'Priya Sharma', role: 'Product Designer', score: 88, time: '2d ago' },
  ],
  'hr-interview': [],
  'final-interview': [],
  'offer': [
    { id: 'c12', name: 'Rahul Verma', role: 'Backend Eng.', score: 85, time: '3d ago' },
  ],
  'hired': [],
  'on-hold': [
    { id: 'c13', name: 'Karthik Rao', role: 'QA Lead', score: 71, time: '5d ago' },
  ],
  'rejected': [
    { id: 'c14', name: 'Meera K.', role: 'Sr. React Dev', score: 45, time: '4d ago' },
  ],
}

function getScoreColor(score) {
  if (score >= 80) return '#00B894'
  if (score >= 60) return '#FDCB6E'
  return '#FF6B6B'
}

export default function PipelinePage() {
  const [selectedJob, setSelectedJob] = useState('all')
  const { isLoading } = useSimulatedLoading(900)

  if (isLoading) {
    return <Skeleton.Page type="kanban" />
  }

  return (
    <div className="pipeline-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hiring Pipeline</h1>
          <p className="page-subtitle">Drag and drop candidates between stages</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <select className="jobs-filter-select" value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
            <option value="all">All Jobs</option>
            <option value="sr-react">Senior React Developer</option>
            <option value="designer">Product Designer</option>
            <option value="data-sci">Data Scientist</option>
          </select>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Add Stage</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {PIPELINE_STAGES.map((stage, stageIdx) => {
          const candidates = STAGE_CANDIDATES[stage.id] || []
          return (
            <motion.div
              key={stage.id}
              className="kanban-column"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stageIdx * 0.04 }}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className="kanban-column-dot" style={{ background: stage.color }} />
                  <span>{stage.name}</span>
                  <span className="kanban-column-count">{candidates.length}</span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="kanban-cards">
                {candidates.map((candidate, idx) => (
                  <motion.div
                    key={candidate.id}
                    className="kanban-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: stageIdx * 0.04 + idx * 0.05 }}
                    whileHover={{ y: -2, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                    draggable
                  >
                    <div className="kanban-card-header">
                      <div className="kanban-card-avatar" style={{
                        background: avatarColor(candidate.name || (stageIdx + idx))
                      }}>
                        {candidate.name.charAt(0)}
                      </div>
                      <div className="kanban-card-info">
                        <span className="kanban-card-name">{candidate.name}</span>
                        <span className="kanban-card-role">{candidate.role}</span>
                      </div>
                      <div
                        className="kanban-card-score"
                        style={{
                          background: `${getScoreColor(candidate.score)}20`,
                          color: getScoreColor(candidate.score),
                        }}
                      >
                        {candidate.score}
                      </div>
                    </div>
                    <div className="kanban-card-footer">
                      <span className="kanban-card-time">{candidate.time}</span>
                      <GripVertical size={14} style={{ color: 'var(--text-disabled)', cursor: 'grab' }} />
                    </div>
                  </motion.div>
                ))}
                
                {candidates.length === 0 && (
                  <div className="kanban-empty">
                    <span>No candidates</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
