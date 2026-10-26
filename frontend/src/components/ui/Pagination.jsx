import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

/**
 * Zoho Recruit-style pagination with records-per-page dropdown and total count.
 *
 * @param {number} currentPage
 * @param {number} totalRecords
 * @param {number} recordsPerPage
 * @param {Function} onPageChange - (page) => void
 * @param {Function} onRecordsPerPageChange - (count) => void
 */
export default function Pagination({
  currentPage = 1,
  totalRecords = 0,
  recordsPerPage = 10,
  onPageChange,
  onRecordsPerPageChange,
}) {
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1
  const start = (currentPage - 1) * recordsPerPage + 1
  const end = Math.min(currentPage * recordsPerPage, totalRecords)

  return (
    <div className="zoho-pagination">
      <div className="zoho-pagination-left">
        <select
          className="zoho-pagination-select"
          value={recordsPerPage}
          onChange={(e) => onRecordsPerPageChange?.(Number(e.target.value))}
        >
          {[10, 20, 30, 40, 50, 100].map(n => (
            <option key={n} value={n}>{n} Records Per Page</option>
          ))}
        </select>
      </div>

      <div className="zoho-pagination-center">
        <button
          className="zoho-pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="zoho-pagination-range">
          {start} to {end}
        </span>
        <button
          className="zoho-pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="zoho-pagination-right">
        <span className="zoho-pagination-total">
          Total Count: <strong>{totalRecords}</strong>
        </span>
      </div>
    </div>
  )
}
