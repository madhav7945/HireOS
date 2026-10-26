import React, { useState } from 'react'
import { Settings2 } from 'lucide-react'
import './ColumnChooser.css'

/**
 * Dropdown button that toggles which table columns are visible.
 * Props: allColumns [{key,label,required?}], visible (array), onToggle(key)
 */
export default function ColumnChooser({ allColumns, visible, onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="column-chooser">
      <button className="btn btn-secondary" onClick={() => setOpen(o => !o)}>
        <Settings2 size={16} /> Columns
      </button>
      {open && (
        <>
          <div className="column-chooser-backdrop" onClick={() => setOpen(false)} />
          <div className="column-chooser-menu">
            <div className="column-chooser-title">Show columns</div>
            {allColumns.map(col => (
              <label key={col.key} className={`column-chooser-item ${col.required ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={visible.includes(col.key)}
                  disabled={col.required}
                  onChange={() => onToggle(col.key)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
