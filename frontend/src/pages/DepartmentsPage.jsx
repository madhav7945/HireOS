import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, MoreHorizontal, Building2, Users, ChevronRight,
  X, Edit2, Trash2, Eye
} from 'lucide-react'
import Pagination from '../components/ui/Pagination'
import { useCreateDepartment, useDepartments } from '../hooks/useSupabase'
import toast from 'react-hot-toast'
import './DepartmentsPage.css'

const MOCK_DEPARTMENTS = [
  { id: 'DEP-001', name: 'Engineering', lead: 'Sarah Chen', parent: null, openJobs: 12, employees: 45, created: '01/15/2026' },
  { id: 'DEP-002', name: 'Product Design', lead: 'Vikram Rao', parent: 'Engineering', openJobs: 4, employees: 12, created: '01/20/2026' },
  { id: 'DEP-003', name: 'Data Science', lead: 'Neha Gupta', parent: 'Engineering', openJobs: 3, employees: 8, created: '02/01/2026' },
  { id: 'DEP-004', name: 'Marketing', lead: 'Priya Sharma', parent: null, openJobs: 5, employees: 22, created: '01/15/2026' },
  { id: 'DEP-005', name: 'Human Resources', lead: 'Ananya Iyer', parent: null, openJobs: 2, employees: 10, created: '01/15/2026' },
  { id: 'DEP-006', name: 'Sales', lead: 'Ravi Kumar', parent: null, openJobs: 8, employees: 30, created: '01/18/2026' },
  { id: 'DEP-007', name: 'DevOps', lead: 'Karthik Rao', parent: 'Engineering', openJobs: 2, employees: 6, created: '03/01/2026' },
  { id: 'DEP-008', name: 'Quality Assurance', lead: 'Meera Nair', parent: 'Engineering', openJobs: 1, employees: 5, created: '03/15/2026' },
]

export default function DepartmentsPage() {
  const { data: departments = [] } = useDepartments()
  const createDepartment = useCreateDepartment()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)

  // Create form state
  const [newDept, setNewDept] = useState({ name: '', parent: '', lead: 'Insyrge Admin' })

  const departmentList = departments.length > 0 ? departments : MOCK_DEPARTMENTS
  const filteredDepts = departmentList.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.lead.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const saveDepartment = async (keepOpen = false) => {
    if (!newDept.name.trim()) {
      toast.error('Department name is required')
      return
    }

    try {
      await createDepartment.mutateAsync(newDept)
      toast.success('Department created')
      setNewDept({ name: '', parent: '', lead: 'Insyrge Admin' })
      if (!keepOpen) setShowCreateForm(false)
    } catch (error) {
      toast.error(error?.message || 'Unable to create department')
    }
  }

  return (
    <div className="departments-page">
      {/* Create Department Form Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              className="modal-content dept-modal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>Create Department</h2>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button type="button" className="dept-edit-layout" onClick={() => toast('Custom page layouts are available on the Enterprise plan')}>Edit Page Layout</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateForm(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <h3 className="dept-section-title">
                  <Building2 size={16} /> Department Information
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label form-label-required">Department Name</label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={newDept.name}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Department</label>
                    <div className="dept-lookup-field">
                      <input
                        type="text"
                        placeholder="Search department..."
                        value={newDept.parent}
                        onChange={(e) => setNewDept(prev => ({ ...prev, parent: e.target.value }))}
                      />
                      <Search size={14} className="dept-lookup-icon" />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department Lead</label>
                    <select
                      value={newDept.lead}
                      onChange={(e) => setNewDept(prev => ({ ...prev, lead: e.target.value }))}
                    >
                      <option>Insyrge Admin</option>
                      <option>Sarah Chen</option>
                      <option>Vikram Rao</option>
                      <option>Priya Sharma</option>
                    </select>
                  </div>
                </div>

                <h3 className="dept-section-title" style={{ marginTop: 'var(--space-6)' }}>
                  Attachment Information
                </h3>
                <div className="form-group">
                  <label className="form-label">Others</label>
                  <div className="dept-browse-btn">
                    <button className="btn btn-secondary btn-sm">
                      Browse ▼
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button className="btn btn-secondary">Save and New</button>
                <button className="btn btn-primary">
                  Save ▼
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header & Toolbar */}
      <div className="app-toolbar">
        <div className="app-toolbar-left">
          <div className="dept-search-wrapper">
            <Search size={14} className="dept-search-icon" />
            <input
              type="text"
              className="dept-search"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="dept-search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(true)}>
            <Plus size={14} /> New Department
          </button>
        </div>
      </div>

      {/* Department Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" style={{ width: 16, height: 16 }} />
              </th>
              <th>DEPARTMENT NAME</th>
              <th>DEPARTMENT LEAD</th>
              <th>PARENT DEPARTMENT</th>
              <th>OPEN JOBS</th>
              <th>EMPLOYEES</th>
              <th>CREATED</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredDepts.map((dept, i) => (
              <motion.tr
                key={dept.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="dept-row"
              >
                <td>
                  <input type="checkbox" style={{ width: 16, height: 16 }} />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="dept-icon">
                      <Building2 size={14} />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--brand-primary-light)', cursor: 'pointer' }}>
                      {dept.name}
                    </span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{dept.lead}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{dept.parent || '—'}</td>
                <td>
                  <span className="badge badge-primary">{dept.openJobs}</span>
                </td>
                <td>{dept.employees}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{dept.created}</td>
                <td className="dept-row-actions">
                  <button className="btn btn-ghost btn-icon btn-sm" title="Edit">
                    <Edit2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalRecords={filteredDepts.length}
        recordsPerPage={recordsPerPage}
        onPageChange={setCurrentPage}
        onRecordsPerPageChange={(n) => { setRecordsPerPage(n); setCurrentPage(1) }}
      />
    </div>
  )
}
