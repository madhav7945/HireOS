import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Plus, Trash2, Bell, ClipboardList, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTasks, useCreateTask, useToggleTask, useDeleteTask } from '../hooks/useSupabase'
import { useAssistantStore } from '../store/assistantStore'
import AutopilotWidget from '../components/pipeline/AutopilotWidget'
import './MyActionsPage.css'

const FILTERS = ['All', 'Tasks', 'Reminders', 'Completed']
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2 }

export default function MyActionsPage() {
  const [filter, setFilter] = useState('All')
  const [newTitle, setNewTitle] = useState('')

  const { data: tasks = [], isLoading } = useTasks(true)
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const openZoe = useAssistantStore((s) => s.openPanel)

  const visible = tasks
    .filter((t) => {
      if (filter === 'Tasks') return t.type === 'task' && !t.done
      if (filter === 'Reminders') return t.type === 'reminder' && !t.done
      if (filter === 'Completed') return t.done
      return !t.done // All = open items
    })
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2))

  const openCount = tasks.filter((t) => !t.done).length

  const handleAdd = async (e) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    await createTask.mutateAsync({ title, type: 'task', priority: 'normal' })
    toast.success('Task added')
  }

  const fmtDate = (d) => {
    if (!d) return null
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="my-actions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Actions</h1>
          <p className="page-subtitle">{openCount} open item{openCount === 1 ? '' : 's'} · tasks &amp; reminders</p>
        </div>
        <button className="btn btn-secondary" onClick={openZoe}>
          <Sparkles size={14} /> Ask Zoe
        </button>
      </div>

      {/* Hiring Autopilot — end-to-end automation + live demo */}
      <AutopilotWidget />

      {/* Add task */}
      <form className="task-add" onSubmit={handleAdd}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task… (or just ask Zoe)"
          className="task-add-input"
        />
        <button type="submit" className="btn btn-primary" disabled={!newTitle.trim()}>
          <Plus size={16} /> Add
        </button>
      </form>

      {/* Filters */}
      <div className="task-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`task-filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="task-loading">Loading…</p>
      ) : visible.length === 0 ? (
        <motion.div className="my-actions-empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="my-actions-empty-icon"><CheckCircle2 size={56} /></div>
          <h3>{filter === 'Completed' ? 'Nothing completed yet' : 'You\'re all caught up'}</h3>
          <p>No {filter === 'All' ? 'open' : filter.toLowerCase()} items. Add one above, or ask Zoe to set a reminder.</p>
        </motion.div>
      ) : (
        <div className="task-list">
          <AnimatePresence initial={false}>
            {visible.map((t) => (
              <motion.div
                key={t.id}
                className={`task-row ${t.done ? 'done' : ''}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                layout
              >
                <button
                  className="task-check"
                  onClick={() => toggleTask.mutate({ id: t.id, done: !t.done })}
                  title={t.done ? 'Mark as not done' : 'Mark done'}
                >
                  {t.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>

                <div className="task-body">
                  <span className="task-title">{t.title}</span>
                  <div className="task-meta">
                    <span className={`task-type ${t.type}`}>
                      {t.type === 'reminder' ? <Bell size={11} /> : <ClipboardList size={11} />}
                      {t.type}
                    </span>
                    {t.priority && t.priority !== 'normal' && (
                      <span className={`task-priority ${t.priority}`}>{t.priority}</span>
                    )}
                    {t.dueDate && <span className="task-due">Due {fmtDate(t.dueDate)}</span>}
                    {t.related && <span className="task-related">{t.related}</span>}
                  </div>
                </div>

                <button
                  className="task-delete"
                  onClick={() => { deleteTask.mutate(t.id); toast('Task deleted') }}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
