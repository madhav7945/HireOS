import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, Printer, Settings,
  Calendar as CalendarIcon, ChevronDown, Loader2, LogIn,
  LogOut, RefreshCw, Trash2, ExternalLink, X, Clock, MapPin
} from 'lucide-react'
import './CalendarPage.css'
import toast from 'react-hot-toast'
import Skeleton from '../components/ui/Skeleton'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import {
  initGoogleCalendar, signInGoogle, signOutGoogle, isSignedIn,
  fetchGoogleEvents, createGoogleEvent, deleteGoogleEvent,
  fetchGoogleCalendars, isGoogleCalendarConfigured, isGoogleCalendarReady
} from '../services/googleCalendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8am - 7pm

const MOCK_EVENTS = [
  { id: 'm1', title: 'Interview: Arjun Patel — Senior React Dev', start: null, end: null, day: 1, hour: 10, duration: 1, color: '#6C5CE7', source: 'local' },
  { id: 'm2', title: 'Interview: Priya Sharma — Product Designer', start: null, end: null, day: 3, hour: 14, duration: 1, color: '#00B894', source: 'local' },
  { id: 'm3', title: 'Team Standup', start: null, end: null, day: 1, hour: 9, duration: 0.5, color: '#FDCB6E', source: 'local' },
  { id: 'm4', title: 'Team Standup', start: null, end: null, day: 3, hour: 9, duration: 0.5, color: '#FDCB6E', source: 'local' },
  { id: 'm5', title: 'Team Standup', start: null, end: null, day: 5, hour: 9, duration: 0.5, color: '#FDCB6E', source: 'local' },
  { id: 'm6', title: 'HR Interview: Neha Gupta', start: null, end: null, day: 4, hour: 11, duration: 1.5, color: '#00D2FF', source: 'local' },
  { id: 'm7', title: 'Offer Discussion — Siddharth', start: null, end: null, day: 2, hour: 15, duration: 1, color: '#FF6B6B', source: 'local' },
]

const DEFAULT_CALENDARS = [
  { id: 'interviews', name: 'Interviews', color: '#6C5CE7', checked: true },
  { id: 'tasks', name: 'Tasks', color: '#FDCB6E', checked: true },
  { id: 'hr', name: 'HR Events', color: '#00D2FF', checked: true },
  { id: 'offers', name: 'Offers', color: '#FF6B6B', checked: true },
]

function getWeekDates(baseDate) {
  const sunday = new Date(baseDate)
  sunday.setDate(baseDate.getDate() - baseDate.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function getMiniCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Convert Google events to the calendar grid format
function googleEventToGrid(event, weekDates) {
  const startDate = event.start
  const dayIdx = weekDates.findIndex(d => d.toDateString() === startDate.toDateString())
  if (dayIdx === -1) return null
  const hour = startDate.getHours()
  const durationMs = event.end - event.start
  const durationHours = durationMs / (1000 * 60 * 60)
  return { ...event, day: dayIdx, hour, duration: Math.max(0.5, durationHours) }
}

// New Event Modal
function NewEventModal({ onClose, onSave, initialDate }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Event title is required'); return }
    setSaving(true)
    try {
      const start = new Date(`${date}T${startTime}:00`)
      const end = new Date(`${date}T${endTime}:00`)
      await onSave({ title, start, end, location, description })
      onClose()
    } catch (err) {
      toast.error('Failed to save event')
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-content" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ maxWidth: 480, padding: 'var(--space-5)', background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>New Event</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="form-label form-label-required">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Interview with..." autoFocus />
        </div>
        <div className="form-row" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Start</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">End</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="form-label">Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Google Meet / Office" />
        </div>
        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="form-label">Description</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="spin" /> Saving...</> : <><Plus size={14} /> Create Event</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState('Week')
  const [showViewDD, setShowViewDD] = useState(false)
  const { isLoading } = useSimulatedLoading(800)

  // Google Calendar state
  const [gcalReady, setGcalReady] = useState(false)
  const [gcalSignedIn, setGcalSignedIn] = useState(false)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [googleEvents, setGoogleEvents] = useState([])
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const today = new Date()
  const weekDates = getWeekDates(currentDate)
  const miniDays = getMiniCalendarDays(currentDate.getFullYear(), currentDate.getMonth())
  const configured = isGoogleCalendarConfigured()

  // Init Google Calendar
  useEffect(() => {
    if (!configured) return
    initGoogleCalendar().then(ok => {
      setGcalReady(ok)
      if (ok && isSignedIn()) {
        setGcalSignedIn(true)
      }
    })
  }, [])

  // Fetch Google events when signed in or week changes
  const loadGoogleEvents = useCallback(async () => {
    if (!gcalSignedIn || !gcalReady) return
    setGcalLoading(true)
    try {
      const start = weekDates[0]
      const end = new Date(weekDates[6])
      end.setHours(23, 59, 59)
      const events = await fetchGoogleEvents(start, end)
      setGoogleEvents(events)
      const cals = await fetchGoogleCalendars()
      if (cals.length) setGoogleCalendars(cals)
    } catch (err) {
      console.error('Failed to load events:', err)
    }
    setGcalLoading(false)
  }, [gcalSignedIn, gcalReady, currentDate])

  useEffect(() => { loadGoogleEvents() }, [loadGoogleEvents])

  const handleGoogleSignIn = async () => {
    try {
      await signInGoogle()
      setGcalSignedIn(true)
      toast.success('Connected to Google Calendar!')
    } catch (err) {
      toast.error('Google sign-in failed')
    }
  }

  const handleGoogleSignOut = () => {
    signOutGoogle()
    setGcalSignedIn(false)
    setGoogleEvents([])
    setGoogleCalendars([])
    toast.success('Disconnected from Google Calendar')
  }

  const handleCreateEvent = async (eventData) => {
    if (gcalSignedIn) {
      try {
        await createGoogleEvent(eventData)
        toast.success('Event created on Google Calendar!')
        loadGoogleEvents()
      } catch (err) {
        toast.error('Failed to create event on Google Calendar')
      }
    } else {
      toast.success('Event created locally!')
    }
  }

  const handleDeleteEvent = async (event) => {
    if (event.source === 'google' && gcalSignedIn) {
      try {
        await deleteGoogleEvent(event.id)
        toast.success('Event deleted from Google Calendar')
        loadGoogleEvents()
      } catch (err) {
        toast.error('Failed to delete event')
      }
    }
    setSelectedEvent(null)
  }

  // Merge mock + google events for grid
  const mergedGridEvents = [
    ...MOCK_EVENTS,
    ...googleEvents.map(e => googleEventToGrid(e, weekDates)).filter(Boolean),
  ]

  const formatWeekRange = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    const opts = { day: '2-digit', month: 'short' }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)} ${end.getFullYear()}`
  }

  const navigatePrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d) }
  const navigateNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d) }
  const navigateToday = () => { setCurrentDate(new Date()) }
  const navigateMonthPrev = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }
  const navigateMonthNext = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }

  if (isLoading) return <Skeleton.Page type="dashboard" />

  return (
    <div className="calendar-page">
      {/* Calendar Header */}
      <div className="cal-header">
        <div className="cal-header-left">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewEvent(true)}>
            <Plus size={14} /> New Event
          </button>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={navigatePrev}><ChevronLeft size={16} /></button>
            <button className="btn btn-secondary btn-sm" onClick={navigateToday}>Today</button>
            <button className="cal-nav-btn" onClick={navigateNext}><ChevronRight size={16} /></button>
          </div>
          <span className="cal-range">{formatWeekRange()}</span>
          {gcalLoading && <Loader2 size={14} className="spin" style={{ color: 'var(--brand-primary-light)', marginLeft: 8 }} />}
        </div>

        <div className="cal-header-right">
          {/* Google Calendar Connection */}
          {configured && (
            gcalSignedIn ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>Google Connected</span>
                <button className="btn btn-ghost btn-sm" onClick={loadGoogleEvents} title="Refresh"><RefreshCw size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={handleGoogleSignOut} title="Disconnect Google"><LogOut size={14} /></button>
              </div>
            ) : gcalReady ? (
              <button className="btn btn-secondary btn-sm" onClick={handleGoogleSignIn}>
                <LogIn size={14} /> Connect Google Calendar
              </button>
            ) : null
          )}

          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowViewDD(!showViewDD)}>
              {viewType} <ChevronDown size={12} />
            </button>
            {showViewDD && (
              <div className="dropdown-menu" style={{ top: '100%', right: 0 }}>
                {['Day', 'Week', 'Month'].map(v => (
                  <button key={v} className={`dropdown-item ${viewType === v ? 'active' : ''}`}
                    onClick={() => { setViewType(v); setShowViewDD(false) }}>{v}</button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" title="Print" onClick={() => { window.print(); toast.success('Print dialog opened') }}>
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="cal-body">
        {/* Left Sidebar */}
        <div className="cal-sidebar">
          {/* Mini Calendar */}
          <div className="cal-mini">
            <div className="cal-mini-header">
              <button className="cal-nav-btn" onClick={navigateMonthPrev}><ChevronLeft size={14} /></button>
              <span className="cal-mini-month">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <button className="cal-nav-btn" onClick={navigateMonthNext}><ChevronRight size={14} /></button>
            </div>
            <div className="cal-mini-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="cal-mini-day-header">{d}</span>
              ))}
              {miniDays.map((day, i) => (
                <span key={i} className={`cal-mini-day ${day === today.getDate() && currentDate.getMonth() === today.getMonth() ? 'today' : ''} ${day ? '' : 'empty'}`}
                  onClick={() => day && (() => { const d = new Date(currentDate); d.setDate(day); setCurrentDate(d) })()}>
                  {day || ''}
                </span>
              ))}
            </div>
          </div>

          {/* Calendars List */}
          <div className="cal-calendars">
            <div className="cal-calendars-header">
              <span>MY CALENDARS</span>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <button className="cal-nav-btn" onClick={() => setShowNewEvent(true)}><Plus size={12} /></button>
                <button className="cal-nav-btn" onClick={() => toast.success('Calendar settings')}><Settings size={12} /></button>
              </div>
            </div>
            {DEFAULT_CALENDARS.map(cal => (
              <label key={cal.id} className="cal-calendar-item">
                <span className="cal-calendar-dot" style={{ background: cal.color }} />
                <span>{cal.name}</span>
              </label>
            ))}

            {/* Google Calendars */}
            {googleCalendars.length > 0 && (
              <>
                <div className="cal-calendars-header" style={{ marginTop: 'var(--space-3)' }}>
                  <span>GOOGLE CALENDARS</span>
                </div>
                {googleCalendars.map(cal => (
                  <label key={cal.id} className="cal-calendar-item">
                    <span className="cal-calendar-dot" style={{ background: cal.color }} />
                    <span>{cal.name}</span>
                    {cal.primary && <span className="badge badge-accent" style={{ fontSize: '0.55rem', marginLeft: 'auto' }}>Primary</span>}
                  </label>
                ))}
              </>
            )}

            {/* Google Calendar CTA if not configured */}
            {!configured && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(66,133,244,0.08)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <CalendarIcon size={20} style={{ color: '#4285F4', marginBottom: 4 }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0' }}>Connect Google Calendar to sync events</p>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', margin: 0 }}>Set VITE_GOOGLE_CLIENT_ID in .env</p>
              </div>
            )}
          </div>
        </div>

        {/* Main View Area */}
        <div className="cal-week">
          {viewType === 'Week' ? (
            <>
              {/* Day Headers */}
              <div className="cal-week-header">
                <div className="cal-time-gutter" />
                {weekDates.map((date, i) => {
                  const isToday = date.toDateString() === today.toDateString()
                  const dayGoogleCount = googleEvents.filter(e => e.start.toDateString() === date.toDateString()).length
                  return (
                    <div key={i} className={`cal-day-header ${isToday ? 'today' : ''}`}>
                      <span className="cal-day-name">{DAYS[i]}</span>
                      <span className={`cal-day-num ${isToday ? 'today' : ''}`}>{date.getDate()}</span>
                      {dayGoogleCount > 0 && <span style={{ fontSize: '0.5rem', color: '#4285F4', fontWeight: 600 }}>{dayGoogleCount} synced</span>}
                    </div>
                  )
                })}
              </div>

              {/* Time Grid */}
              <div className="cal-week-grid">
                {HOURS.map(hour => (
                  <div key={hour} className="cal-time-row">
                    <div className="cal-time-label">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </div>
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const events = mergedGridEvents.filter(e => e.day === dayIdx && e.hour === hour)
                      return (
                        <div key={dayIdx} className="cal-time-cell">
                          {events.map(event => (
                            <motion.div
                              key={event.id}
                              className="cal-event"
                              style={{
                                background: `${event.color}20`,
                                borderLeft: `3px solid ${event.color}`,
                                height: `${event.duration * 48}px`,
                              }}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <span className="cal-event-title">{event.title}</span>
                              {event.source === 'google' && <span style={{ fontSize: '0.5rem', opacity: 0.6 }}>📅 Google</span>}
                            </motion.div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : viewType === 'Month' ? (
            <div className="cal-month-grid">
              <div className="cal-month-headers">
                {DAYS.map(d => <div key={d} className="cal-month-header">{d}</div>)}
              </div>
              <div className="cal-month-days">
                {miniDays.map((day, i) => {
                  if (!day) return <div key={i} className="cal-month-day empty"></div>
                  const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
                  const isToday = dateStr === today.toDateString()
                  const dayEvents = mergedGridEvents.filter(e => {
                    const eDate = e.start ? e.start.toDateString() : null
                    // For mock events without start, map them to current week days loosely for demo
                    if (!e.start && e.day !== undefined) {
                       const mappedDate = new Date(weekDates[0])
                       mappedDate.setDate(mappedDate.getDate() + e.day)
                       return mappedDate.toDateString() === dateStr
                    }
                    return eDate === dateStr
                  })
                  
                  return (
                    <div key={i} className={`cal-month-day ${isToday ? 'today' : ''}`}>
                      <span className="cal-month-day-num">{day}</span>
                      <div className="cal-month-events">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id} 
                            className="cal-month-event" 
                            style={{ background: `${event.color}20`, borderLeft: `2px solid ${event.color}` }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.time || `${event.hour}:00`} - {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <style>{`
                .cal-month-grid { display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
                .cal-month-headers { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--surface-elevated); border-bottom: 1px solid var(--border-subtle); }
                .cal-month-header { padding: var(--space-2); text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
                .cal-month-days { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(100px, 1fr); flex: 1; }
                .cal-month-day { padding: var(--space-2); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
                .cal-month-day.empty { background: rgba(0,0,0,0.02); }
                .cal-month-day-num { font-size: 0.85rem; font-weight: 600; align-self: flex-end; width: 24px; height: 24px; display: flex; alignItems: center; justifyContent: center; borderRadius: 50%; }
                .cal-month-day.today .cal-month-day-num { background: var(--brand-primary); color: white; }
                .cal-month-events { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
                .cal-month-event { font-size: 0.7rem; padding: 2px 4px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; color: var(--text-primary); }
                .cal-month-event:hover { filter: brightness(1.2); }
              `}</style>
            </div>
          ) : (
             <div className="cal-day-view">
                <div className="cal-day-header-single">
                   <h2>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                </div>
                <div className="cal-week-grid cal-day-grid" style={{ gridTemplateColumns: '60px 1fr' }}>
                  {HOURS.map(hour => (
                    <div key={hour} className="cal-time-row">
                      <div className="cal-time-label">
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </div>
                      <div className="cal-time-cell">
                         {mergedGridEvents.filter(e => {
                            if (e.start) return e.start.toDateString() === currentDate.toDateString() && e.start.getHours() === hour;
                            // Mock logic
                            const dayDiff = currentDate.getDay()
                            return e.day === dayDiff && e.hour === hour
                         }).map(event => (
                           <motion.div key={event.id} className="cal-event"
                             style={{ background: `${event.color}20`, borderLeft: `3px solid ${event.color}`, height: `${event.duration * 48}px` }}
                             onClick={() => setSelectedEvent(event)}>
                             <span className="cal-event-title">{event.title}</span>
                           </motion.div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && <NewEventModal onClose={() => setShowNewEvent(false)} onSave={handleCreateEvent} />}
      </AnimatePresence>

      {/* Event Detail Popup */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ maxWidth: 400, padding: 'var(--space-5)', background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedEvent.color, display: 'inline-block', marginRight: 8 }} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{selectedEvent.title}</span>
                  {selectedEvent.source === 'google' && <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: '0.55rem' }}>Google</span>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedEvent(null)}><X size={16} /></button>
              </div>
              {selectedEvent.location && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} /> {selectedEvent.location}</p>}
              {selectedEvent.start && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={13} /> {selectedEvent.start.toLocaleString()} — {selectedEvent.end?.toLocaleTimeString()}</p>}
              {selectedEvent.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>{selectedEvent.description}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                {selectedEvent.htmlLink && <a href={selectedEvent.htmlLink} target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><ExternalLink size={14} /> Open in Google</a>}
                {selectedEvent.source === 'google' && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDeleteEvent(selectedEvent)}><Trash2 size={14} /> Delete</button>}
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelectedEvent(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
