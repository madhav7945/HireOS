import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Users, Shield, Link2, Bell, Palette, Globe,
  Database, Key, Mail, ChevronRight, Save, Upload, MessageSquare,
  GitBranch, Link, CheckCircle, XCircle, ExternalLink, Plus
} from 'lucide-react'
import { useAuthStore } from '../store'
import Skeleton from '../components/ui/Skeleton'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { useCustomFields, slugify } from '../hooks/useCustomFields'
import toast from 'react-hot-toast'
import './SettingsPage.css'

const SECTIONS = [
  { id: 'company', icon: Building2, label: 'Company Profile', desc: 'Name, logo, industry' },
  { id: 'departments', icon: Users, label: 'Departments', desc: 'Manage teams' },
  { id: 'roles', icon: Shield, label: 'Roles & Permissions', desc: 'RBAC settings' },
  { id: 'customfields', icon: Plus, label: 'Custom Fields', desc: 'Add fields to modules' },
  { id: 'integrations', icon: Link2, label: 'Integrations', desc: 'Job boards, HRMS' },
  { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Channel settings' },
  { id: 'branding', icon: Palette, label: 'Branding', desc: 'Career page' },
  { id: 'templates', icon: Mail, label: 'Templates', desc: 'Email & letters' },
  { id: 'pipeline', icon: Database, label: 'Pipeline', desc: 'Stages & rules' },
  { id: 'security', icon: Key, label: 'Security', desc: '2FA, GDPR' },
  { id: 'api', icon: Globe, label: 'API', desc: 'Keys & webhooks' },
]

const INTEGRATIONS = [
  { name: 'Slack', icon: MessageSquare, color: '#E01E5A', bg: 'rgba(224, 30, 90, 0.1)', connected: true },
  { name: 'GitHub', icon: GitBranch, color: '#F0F0FF', bg: 'rgba(240, 240, 255, 0.08)', connected: false },
  { name: 'LinkedIn', icon: Link, color: '#0077B5', bg: 'rgba(0, 119, 181, 0.1)', connected: true },
  { name: 'Google', icon: Globe, color: '#4285F4', bg: 'rgba(66, 133, 244, 0.1)', connected: false },
  { name: 'Supabase', icon: Database, color: '#3ECF8E', bg: 'rgba(62, 207, 142, 0.1)', connected: false },
  { name: 'SMTP', icon: Mail, color: '#74B9FF', bg: 'rgba(116, 185, 255, 0.1)', connected: true },
]

import { useCompany, useUpdateCompany } from '../hooks/useSupabase'

function CompanySection() {
  const { data: company, isLoading } = useCompany()
  const { mutate: updateCompany } = useUpdateCompany()
  
  const logoInputRef = React.useRef(null)
  
  const [name, setName] = useState(company?.name || 'HireOS Technologies')
  const [logo, setLogo] = useState(company?.logoUrl || null)
  
  // Keep form in sync when company loads
  React.useEffect(() => {
    if (company) {
      setName(company.name)
      setLogo(company.logoUrl)
    }
  }, [company])

  const onPickLogo = (file) => {
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) { toast.error('Please use an image under 1.5 MB'); return }
    const reader = new FileReader()
    reader.onload = () => { 
      setLogo(reader.result)
      toast.success('Logo selected. Click Save Changes to apply.') 
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateCompany(
      { name, logoUrl: logo },
      { onSuccess: () => toast.success('Company profile saved!') }
    )
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2 className="settings-section-title"><Building2 size={20} /> Company Profile</h2>
      <p className="settings-section-desc">Manage your organization's public-facing information and branding.</p>

      <div className="settings-field-group">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label form-label-required">Company Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <select defaultValue="Technology">
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>Education</option>
              <option>E-Commerce</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-field-group">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Website</label>
            <input type="url" defaultValue="https://hireos.ai" />
          </div>
          <div className="form-group">
            <label className="form-label">Company Size</label>
            <select defaultValue="50-200">
              <option>1-10</option>
              <option>11-50</option>
              <option>50-200</option>
              <option>200-1000</option>
              <option>1000+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-field-group">
        <div className="form-group">
          <label className="form-label">Company Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--radius-lg)',
              background: logo ? `center/cover no-repeat url(${logo})` : 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: 800, color: 'white', overflow: 'hidden'
            }}>
              {!logo && 'H'}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { onPickLogo(e.target.files?.[0]); e.target.value = '' }} />
            <button className="btn btn-secondary" onClick={() => logoInputRef.current?.click()}>
              <Upload size={14} /> Upload New Logo
            </button>
            {logo && <button className="btn btn-ghost btn-sm" onClick={() => { setLogo(null); toast.success('Logo removed') }}>Remove</button>}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={() => {
            setName(company?.name || 'HireOS Technologies')
            setLogo(company?.logoUrl || null)
            toast.error('Changes cancelled')
        }}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={14} /> Save Changes
        </button>
      </div>
    </div>
  )
}

function NotificationsSection() {
  return (
    <div>
      <h2 className="settings-section-title"><Bell size={20} /> Notifications</h2>
      <p className="settings-section-desc">Configure how and when you receive alerts about hiring activity.</p>

      {[
        { label: 'New Applications', desc: 'Get notified when candidates apply', default: true },
        { label: 'Interview Completed', desc: 'AI interview results are ready', default: true },
        { label: 'Offer Responses', desc: 'Candidate accepts or declines offer', default: true },
        { label: 'Pipeline Stage Changes', desc: 'Candidates move between stages', default: false },
        { label: 'Daily Digest', desc: 'Summary of all recruitment activity', default: false },
        { label: 'Slack Notifications', desc: 'Send alerts to connected Slack channel', default: true },
      ].map((item) => (
        <div key={item.label} className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">{item.label}</span>
            <span className="settings-toggle-desc">{item.desc}</span>
          </div>
          <label className="toggle">
            <input type="checkbox" defaultChecked={item.default} />
            <span className="toggle-slider" />
          </label>
        </div>
      ))}

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={() => toast.success('Notification preferences saved!')}>
          <Save size={14} /> Save Preferences
        </button>
      </div>
    </div>
  )
}

function IntegrationsSection() {
  const [connected, setConnected] = useState(() => {
    const saved = localStorage.getItem('hireos_integrations')
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return Object.fromEntries(INTEGRATIONS.map(i => [i.name, i.connected]))
  })
  const toggle = (name) => {
    setConnected(prev => {
      const next = { ...prev, [name]: !prev[name] }
      localStorage.setItem('hireos_integrations', JSON.stringify(next))
      toast.success(next[name] ? `${name} connected` : `${name} disconnected`)
      return next
    })
  }
  return (
    <div>
      <h2 className="settings-section-title"><Link2 size={20} /> Integrations</h2>
      <p className="settings-section-desc">Connect HireOS with your existing tools and services.</p>

      <div className="settings-integrations-grid">
        {INTEGRATIONS.map((item) => {
          const Icon = item.icon
          const isConnected = connected[item.name]
          return (
            <div key={item.name} className="settings-integration-card">
              <div className="settings-integration-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={24} />
              </div>
              <span className="settings-integration-name">{item.name}</span>
              {isConnected ? (
                <>
                  <span className="settings-integration-status" style={{ color: 'var(--color-success)' }}>
                    <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Connected
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(item.name)}>Disconnect</button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => toggle(item.name)}>
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BrandingSection() {
  const [headline, setHeadline] = useState('Join the future of AI-powered hiring')
  const [description, setDescription] = useState("We're building the next generation of recruitment technology. Join our team and help shape how companies hire top talent.")
  const [showPreview, setShowPreview] = useState(false)
  return (
    <div>
      <h2 className="settings-section-title"><Palette size={20} /> Branding</h2>
      <p className="settings-section-desc">Customize the appearance of your career page and candidate-facing emails.</p>

      <div className="settings-field-group">
        <div className="settings-field-label">Brand Colors</div>
        <div className="settings-field-hint">These colors appear on your career page and offer letters.</div>
        <div className="settings-color-preview">
          <div className="settings-color-swatch" style={{ background: '#6C5CE7' }} title="Primary" />
          <div className="settings-color-swatch" style={{ background: '#00D2FF' }} title="Accent" />
          <div className="settings-color-swatch" style={{ background: '#0A0A1A' }} title="Background" />
          <div className="settings-color-swatch" style={{ background: '#00B894' }} title="Success" />
        </div>
      </div>

      <div className="settings-field-group">
        <div className="form-group">
          <label className="form-label">Career Page Headline</label>
          <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} />
        </div>
      </div>

      <div className="settings-field-group">
        <div className="form-group">
          <label className="form-label">Career Page Description</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={() => setShowPreview(true)}>Preview Career Page</button>
        <button className="btn btn-primary" onClick={() => { localStorage.setItem('hireos_branding', JSON.stringify({ headline, description })); toast.success('Branding settings saved!') }}>
          <Save size={14} /> Save Changes
        </button>
      </div>

      {showPreview && (
        <div className="settings-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="settings-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <span><Globe size={16} /> Career Page Preview</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPreview(false)}><XCircle size={18} /></button>
            </div>
            <div className="career-preview">
              <div className="career-preview-hero" style={{ background: 'var(--color-primary)' }}>
                <h1>{headline}</h1>
                <p>{description}</p>
                <button className="btn btn-primary" style={{ marginTop: 12 }}>View Open Roles →</button>
              </div>
              <div className="career-preview-jobs">
                <span className="career-preview-label">Open Positions</span>
                {['Senior React Developer', 'Product Designer', 'Data Scientist'].map(j => (
                  <div key={j} className="career-preview-job"><span>{j}</span><span className="badge badge-accent">Apply</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SecuritySection() {
  return (
    <div>
      <h2 className="settings-section-title"><Key size={20} /> Security</h2>
      <p className="settings-section-desc">Manage authentication, data privacy, and compliance settings.</p>

      {[
        { label: 'Two-Factor Authentication', desc: 'Require 2FA for all team members', default: false },
        { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', default: true },
        { label: 'IP Whitelisting', desc: 'Restrict access to approved IP addresses', default: false },
        { label: 'GDPR Compliance Mode', desc: 'Auto-delete candidate data after 12 months', default: true },
        { label: 'Audit Logging', desc: 'Track all user actions for compliance', default: true },
      ].map((item) => (
        <div key={item.label} className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">{item.label}</span>
            <span className="settings-toggle-desc">{item.desc}</span>
          </div>
          <label className="toggle">
            <input type="checkbox" defaultChecked={item.default} />
            <span className="toggle-slider" />
          </label>
        </div>
      ))}

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={() => toast.success('Security settings saved!')}>
          <Save size={14} /> Save Settings
        </button>
      </div>
    </div>
  )
}

function DepartmentsSection() {
  const [depts, setDepts] = useState([
    { id: 1, name: 'Engineering', head: 'Vikram Patel', headcount: 45, open: 8 },
    { id: 2, name: 'Design', head: 'Ananya Sharma', headcount: 12, open: 3 },
    { id: 3, name: 'Data & AI', head: 'Dr. Meera Iyer', headcount: 18, open: 2 },
    { id: 4, name: 'Marketing', head: 'Priti Desai', headcount: 8, open: 1 },
    { id: 5, name: 'Human Resources', head: 'Kavitha Nair', headcount: 6, open: 1 },
  ])
  const [newDept, setNewDept] = useState('')
  const addDept = () => { if (!newDept.trim()) return; setDepts(p => [...p, { id: Date.now(), name: newDept, head: '—', headcount: 0, open: 0 }]); setNewDept(''); toast.success(`Department "${newDept}" added`) }
  const removeDept = (id) => { setDepts(p => p.filter(d => d.id !== id)); toast.success('Department removed') }
  return (
    <div>
      <h2 className="settings-section-title"><Users size={20} /> Departments</h2>
      <p className="settings-section-desc">Manage your organization's departments and team structure.</p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <input type="text" placeholder="New department name..." value={newDept} onChange={e => setNewDept(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDept()} style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={addDept}><Plus size={14} /> Add</button>
      </div>
      <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
        <table><thead><tr><th>Department</th><th>Head</th><th>Headcount</th><th>Open Roles</th><th></th></tr></thead>
          <tbody>{depts.map(d => (
            <tr key={d.id}><td style={{ fontWeight: 600 }}>{d.name}</td><td style={{ color: 'var(--text-secondary)' }}>{d.head}</td><td>{d.headcount}</td><td><span className="badge badge-accent">{d.open}</span></td>
              <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => removeDept(d.id)}><XCircle size={14} /></button></td></tr>
          ))}</tbody></table>
      </div>
    </div>
  )
}

const ALL_PERMS = ['Manage jobs', 'Manage candidates', 'AI Interviews', 'View reports', 'View candidates', 'Interview feedback', 'Approve offers', 'Settings', 'View-only access']

function RolesSection() {
  const [roles, setRoles] = useState([
    { id: 1, name: 'Super Admin', users: 1, perms: ['All permissions'] },
    { id: 2, name: 'Admin', users: 2, perms: ['Manage jobs', 'Manage candidates', 'View reports', 'Settings'] },
    { id: 3, name: 'Recruiter', users: 5, perms: ['Manage jobs', 'Manage candidates', 'AI Interviews'] },
    { id: 4, name: 'Hiring Manager', users: 8, perms: ['View candidates', 'Interview feedback', 'Approve offers'] },
    { id: 5, name: 'Viewer', users: 3, perms: ['View-only access'] },
  ])
  const [editing, setEditing] = useState(null)

  const openEdit = (role) => setEditing(role ? { ...role } : { id: Date.now(), name: '', users: 0, perms: [], isNew: true })
  const togglePerm = (p) => setEditing(prev => ({ ...prev, perms: prev.perms.includes(p) ? prev.perms.filter(x => x !== p) : [...prev.perms, p] }))
  const save = () => {
    if (!editing.name.trim()) { toast.error('Role name is required'); return }
    setRoles(prev => editing.isNew ? [...prev, { ...editing, isNew: undefined }] : prev.map(r => r.id === editing.id ? editing : r))
    toast.success(editing.isNew ? 'Role created!' : `${editing.name} role updated`)
    setEditing(null)
  }

  return (
    <div>
      <h2 className="settings-section-title"><Shield size={20} /> Roles & Permissions</h2>
      <p className="settings-section-desc">Define access levels and permissions for your team members.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {roles.map(r => (
          <div key={r.id} className="settings-field-group" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <div><span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)' }}>{r.name}</span><span className="badge badge-primary" style={{ marginLeft: 8 }}>{r.users} users</span></div>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><ExternalLink size={14} /> Edit</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{r.perms.map(p => <span key={p} className="badge badge-accent" style={{ fontSize: '0.65rem' }}>{p}</span>)}</div>
          </div>
        ))}
      </div>
      <div className="settings-actions"><button className="btn btn-primary" onClick={() => openEdit(null)}><Plus size={14} /> Create Custom Role</button></div>

      {editing && (
        <div className="settings-modal-overlay" onClick={() => setEditing(null)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <span><Shield size={16} /> {editing.isNew ? 'Create Role' : `Edit ${editing.name}`}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(null)}><XCircle size={18} /></button>
            </div>
            <div className="settings-modal-body">
              <div className="form-group">
                <label className="form-label form-label-required">Role Name</label>
                <input type="text" value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sourcer" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {ALL_PERMS.map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={editing.perms.includes(p)} onChange={() => togglePerm(p)} /> {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}><Save size={14} /> Save Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEFAULT_TEMPLATE_BODY = {
  'Interview Invitation': 'Hi {{candidate}},\n\nWe were impressed by your application for {{role}} and would love to invite you to an interview.\n\nPlease use the link below to pick a slot:\n{{link}}\n\nBest,\n{{recruiter}}',
  'Offer Letter': 'Dear {{candidate}},\n\nWe are delighted to offer you the position of {{role}} at {{company}}.\n\nAnnual CTC: {{salary}}\nStart date: {{start_date}}\n\nWe look forward to having you on the team!',
}

function TemplatesSection() {
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Interview Invitation', type: 'Email', lastEdited: '2 days ago', active: true, body: DEFAULT_TEMPLATE_BODY['Interview Invitation'] },
    { id: 2, name: 'Offer Letter', type: 'Document', lastEdited: '1 week ago', active: true, body: DEFAULT_TEMPLATE_BODY['Offer Letter'] },
    { id: 3, name: 'Rejection — After Screening', type: 'Email', lastEdited: '3 days ago', active: true, body: 'Hi {{candidate}},\n\nThank you for applying for {{role}}. After careful review we have decided to move forward with other candidates at this time.\n\nWe wish you the best.' },
    { id: 4, name: 'Rejection — After Interview', type: 'Email', lastEdited: '5 days ago', active: true, body: 'Hi {{candidate}},\n\nThank you for taking the time to interview for {{role}}. Unfortunately we will not be proceeding further.' },
    { id: 5, name: 'Onboarding Welcome', type: 'Email', lastEdited: '2 weeks ago', active: false, body: 'Welcome aboard, {{candidate}}! Here is everything you need for your first day.' },
    { id: 6, name: 'Reference Check Request', type: 'Email', lastEdited: '1 month ago', active: true, body: 'Hi, we are conducting a reference check for {{candidate}}. Could you share your feedback?' },
  ])
  const [editing, setEditing] = useState(null)

  const openEdit = (t) => setEditing(t ? { ...t } : { id: Date.now(), name: '', type: 'Email', active: true, body: '', isNew: true })
  const toggleActive = (id) => setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  const save = () => {
    if (!editing.name.trim()) { toast.error('Template name is required'); return }
    setTemplates(prev => editing.isNew
      ? [...prev, { ...editing, isNew: undefined, lastEdited: 'just now' }]
      : prev.map(t => t.id === editing.id ? { ...editing, lastEdited: 'just now' } : t))
    toast.success(editing.isNew ? 'Template created!' : `"${editing.name}" saved`)
    setEditing(null)
  }

  return (
    <div>
      <h2 className="settings-section-title"><Mail size={20} /> Email & Document Templates</h2>
      <p className="settings-section-desc">Customize automated communications sent to candidates and team members.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {templates.map(t => (
          <div key={t.id} className="settings-toggle-row" style={{ cursor: 'pointer' }} onClick={() => openEdit(t)}>
            <div className="settings-toggle-info">
              <span className="settings-toggle-label">{t.name}</span>
              <span className="settings-toggle-desc"><span className="badge badge-primary" style={{ marginRight: 6 }}>{t.type}</span>Last edited {t.lastEdited}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="toggle"><input type="checkbox" checked={t.active} onChange={() => toggleActive(t.id)} onClick={e => e.stopPropagation()} /><span className="toggle-slider" /></label>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(t) }}><ExternalLink size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="settings-actions"><button className="btn btn-primary" onClick={() => openEdit(null)}><Plus size={14} /> Create Template</button></div>

      {editing && (
        <div className="settings-modal-overlay" onClick={() => setEditing(null)}>
          <div className="settings-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <span><Mail size={16} /> {editing.isNew ? 'Create Template' : 'Edit Template'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(null)}><XCircle size={18} /></button>
            </div>
            <div className="settings-modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label form-label-required">Template Name</label>
                  <input type="text" value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Assessment Invite" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={editing.type} onChange={e => setEditing(p => ({ ...p, type: e.target.value }))}>
                    <option>Email</option>
                    <option>Document</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Body</label>
                <textarea rows={8} value={editing.body} onChange={e => setEditing(p => ({ ...p, body: e.target.value }))} placeholder="Use {{candidate}}, {{role}}, {{company}} as merge tags..." style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                <span className="settings-field-hint">Merge tags: {'{{candidate}}'} {'{{role}}'} {'{{company}}'} {'{{recruiter}}'} {'{{salary}}'}</span>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}><Save size={14} /> Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineSection() {
  const [stages, setStages] = useState([
    { id: 1, name: 'Applied', color: '#74B9FF', autoMove: false, sla: 3 },
    { id: 2, name: 'Screening', color: '#A29BFE', autoMove: true, sla: 2 },
    { id: 3, name: 'Shortlisted', color: '#6C5CE7', autoMove: false, sla: 5 },
    { id: 4, name: 'AI Interview', color: '#00D2FF', autoMove: true, sla: 3 },
    { id: 5, name: 'HR Review', color: '#FDCB6E', autoMove: false, sla: 2 },
    { id: 6, name: 'HR Interview', color: '#E17055', autoMove: false, sla: 5 },
    { id: 7, name: 'Offer', color: '#55EFC4', autoMove: false, sla: 3 },
    { id: 8, name: 'Hired', color: '#00B894', autoMove: false, sla: 0 },
  ])
  return (
    <div>
      <h2 className="settings-section-title"><GitBranch size={20} /> Pipeline Configuration</h2>
      <p className="settings-section-desc">Define hiring stages, SLA rules, and automation triggers.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {stages.map((s, i) => (
          <div key={s.id} className="settings-toggle-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">{i + 1}. {s.name}</span>
                <span className="settings-toggle-desc">SLA: {s.sla > 0 ? `${s.sla} days` : 'None'} {s.autoMove ? '• Auto-advance enabled' : ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="toggle"><input type="checkbox" defaultChecked={s.autoMove} onChange={() => { const updated = [...stages]; updated[i].autoMove = !updated[i].autoMove; setStages(updated); toast.success(`Auto-advance ${!s.autoMove ? 'enabled' : 'disabled'} for ${s.name}`) }} /><span className="toggle-slider" /></label>
            </div>
          </div>
        ))}
      </div>
      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={() => toast.success('Stage added!')}>+ Add Stage</button>
        <button className="btn btn-primary" onClick={() => toast.success('Pipeline configuration saved!')}><Save size={14} /> Save Pipeline</button>
      </div>
    </div>
  )
}

function genApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `hros_live_sk_${s}`
}

function APISection() {
  const [showKey, setShowKey] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hireos_api_key') || 'hros_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6')
  const copyKey = () => { navigator.clipboard.writeText(apiKey); toast.success('API key copied to clipboard!') }
  const regenerate = () => {
    const next = genApiKey()
    setApiKey(next)
    localStorage.setItem('hireos_api_key', next)
    setShowKey(true)
    toast.success('New API key generated')
  }
  const [webhooks] = useState([
    { id: 1, url: 'https://hooks.slack.com/services/T.../B.../xxx', event: 'interview.completed', active: true },
    { id: 2, url: 'https://api.myhrms.com/webhooks/hireos', event: 'candidate.hired', active: true },
    { id: 3, url: 'https://zapier.com/hooks/catch/123456/', event: 'offer.accepted', active: false },
  ])
  return (
    <div>
      <h2 className="settings-section-title"><Globe size={20} /> API & Webhooks</h2>
      <p className="settings-section-desc">Manage API keys and configure webhook endpoints for integrations.</p>
      <div className="settings-field-group">
        <div className="settings-field-label">API Key</div>
        <div className="settings-field-hint">Use this key to authenticate requests to the HireOS API.</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-2)' }}>
          <input type={showKey ? 'text' : 'password'} value={apiKey} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
          <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(!showKey)}>{showKey ? <XCircle size={14} /> : <Key size={14} />} {showKey ? 'Hide' : 'Show'}</button>
          <button className="btn btn-secondary btn-sm" onClick={copyKey}>Copy</button>
        </div>
      </div>
      <div className="settings-field-group" style={{ marginTop: 'var(--space-5)' }}>
        <div className="settings-field-label">Webhooks</div>
        <div className="settings-field-hint">Receive real-time notifications when events occur in HireOS.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          {webhooks.map(w => (
            <div key={w.id} className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{w.url.substring(0, 45)}...</span>
                <span className="settings-toggle-desc"><span className="badge badge-accent">{w.event}</span></span>
              </div>
              <label className="toggle"><input type="checkbox" defaultChecked={w.active} /><span className="toggle-slider" /></label>
            </div>
          ))}
        </div>
      </div>
      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={() => toast.success('Webhook endpoint added!')}>+ Add Webhook</button>
        <button className="btn btn-primary" onClick={regenerate}><Key size={14} /> Regenerate Key</button>
      </div>
    </div>
  )
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

function CustomFieldsSection() {
  const { all, addField, removeField } = useCustomFields()
  const [module, setModule] = useState('candidates')
  const [label, setLabel] = useState('')
  const [type, setType] = useState('text')
  const [options, setOptions] = useState('')
  const [required, setRequired] = useState(false)

  const fields = all[module] || []

  const add = () => {
    if (!label.trim()) { toast.error('Field label is required'); return }
    const key = slugify(label)
    if (fields.some(f => f.key === key)) { toast.error('A field with this name already exists'); return }
    addField(module, {
      key,
      label: label.trim(),
      type,
      required,
      ...(type === 'select' ? { options: options.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    })
    setLabel(''); setOptions(''); setRequired(false); setType('text')
    toast.success(`Custom field "${label}" added to ${module}`)
  }

  return (
    <div>
      <h2 className="settings-section-title"><Plus size={20} /> Custom Fields</h2>
      <p className="settings-section-desc">Add your own fields to any module. They appear in create forms and record details instantly.</p>

      <div className="settings-field-group">
        <div className="form-group">
          <label className="form-label">Module</label>
          <select value={module} onChange={e => setModule(e.target.value)}>
            <option value="candidates">Candidates</option>
            <option value="jobs">Job Openings</option>
          </select>
        </div>
      </div>

      <div className="settings-field-group">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label form-label-required">Field Label</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Visa Status" />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {type === 'select' && (
          <div className="form-group">
            <label className="form-label">Options (comma-separated)</label>
            <input type="text" value={options} onChange={e => setOptions(e.target.value)} placeholder="Citizen, Work Permit, Needs Sponsorship" />
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Required field
        </label>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={add}><Plus size={14} /> Add Field</button>
        </div>
      </div>

      <div className="settings-field-group">
        <div className="settings-field-label">Existing custom fields — {module}</div>
        {fields.length === 0 ? (
          <p className="settings-field-hint" style={{ marginTop: 8 }}>No custom fields yet for this module.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {fields.map(f => (
              <div key={f.key} className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">{f.label}{f.required ? ' *' : ''}</span>
                  <span className="settings-toggle-desc">
                    <span className="badge badge-primary" style={{ marginRight: 6 }}>{f.type}</span>
                    {f.type === 'select' && f.options ? f.options.join(', ') : f.key}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { removeField(module, f.key); toast.success('Field removed') }}>
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [active, setActive] = useState('company')
  const { company } = useAuthStore()
  const { isLoading } = useSimulatedLoading(700)

  if (isLoading) {
    return <Skeleton.Page type="table" />
  }

  const renderContent = () => {
    switch (active) {
      case 'company': return <CompanySection company={company} />
      case 'departments': return <DepartmentsSection />
      case 'roles': return <RolesSection />
      case 'customfields': return <CustomFieldsSection />
      case 'integrations': return <IntegrationsSection />
      case 'notifications': return <NotificationsSection />
      case 'branding': return <BrandingSection />
      case 'templates': return <TemplatesSection />
      case 'pipeline': return <PipelineSection />
      case 'security': return <SecuritySection />
      case 'api': return <APISection />
      default: return <CompanySection company={company} />
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure workspace, integrations, and preferences</p>
        </div>
      </div>
      <div className="settings-layout">
        <div className="settings-nav">
          {SECTIONS.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              className={`settings-nav-item ${active === id ? 'active' : ''}`}
              onClick={() => setActive(id)}
            >
              <Icon size={18} />
              <div className="settings-nav-text">
                <span className="settings-nav-label">{label}</span>
                <span className="settings-nav-desc">{desc}</span>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          ))}
        </div>
        <motion.div className="settings-content" key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {renderContent()}
        </motion.div>
      </div>
    </div>
  )
}
