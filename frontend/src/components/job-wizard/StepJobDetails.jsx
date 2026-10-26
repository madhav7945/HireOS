import React, { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { zoeGenerate } from '../../services/ai'
import toast from 'react-hot-toast'

export default function StepJobDetails({ job = {}, updateJob = () => {}, errors = {} }) {
  const mustHave = job.mustHave || []
  const niceToHave = job.niceToHave || []

  const [newMustHave, setNewMustHave] = useState('')
  const [newNiceToHave, setNewNiceToHave] = useState('')
  const [zoeLoading, setZoeLoading] = useState(null)

  const handleZoe = async (type) => {
    setZoeLoading(type)
    try {
      const result = await zoeGenerate(job, type)
      if (type === 'description') updateJob({ description: result })
      if (type === 'responsibilities') updateJob({ responsibilities: result })
      if (type === 'requirements') {
        const text = typeof result === 'string' ? result : String(result || '')
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        const bullets = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*')).map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
        updateJob({ mustHave: bullets.length > 0 ? bullets : lines })
      }
      toast.success('Zoe AI has written the ' + type + ' for you!')
    } catch (err) {
      toast.error('Zoe failed: ' + err.message)
    } finally {
      setZoeLoading(null)
    }
  }

  const addTag = (field, val, setter) => {
    const t = val.trim()
    if (!t) return
    const arr = field === 'mustHave' ? mustHave : niceToHave
    if (arr.includes(t)) return
    updateJob({ [field]: [...arr, t] })
    if (setter) setter('')
  }

  const removeTag = (field, val) => {
    const arr = field === 'mustHave' ? mustHave : niceToHave
    updateJob({ [field]: arr.filter(v => v !== val) })
  }

  const inputStyle = (field) => ({
    width:'100%',padding:'10px 12px',fontSize:'0.9rem',
    border:`1px solid ${errors[field]?'#EF4444':'var(--border-default)'}`,
    borderRadius:'6px',background:errors[field]?'rgba(239,68,68,0.05)':'var(--surface-input)',
    color:'var(--text-primary)',fontFamily:'inherit',minHeight:'40px'
  })

  const labelStyle = {fontSize:'0.85rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'6px',display:'block'}
  const errorStyle = {fontSize:'0.75rem',color:'#EF4444',marginTop:'4px'}

  const Section = ({title,children}) => (
    <div style={{marginBottom:'32px',padding:'24px',borderRadius:'12px',background:'var(--surface-card)',border:'1px solid var(--border-subtle)'}}>
      <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:'20px',paddingBottom:'12px',borderBottom:'1px solid var(--border-subtle)',color:'var(--text-primary)'}}>{title}</h3>
      {children}
    </div>
  )

  const TagInput = ({label:lb,value,onChange,onAdd,tagList=[],field,placeholder}) => (
    <div style={{marginBottom:'20px'}}>
      <label style={labelStyle}>{lb}</label>
      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
        <input type="text" value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onAdd()}}}
          placeholder={placeholder} style={{...inputStyle(field),flex:1}} />
        <button type="button" onClick={onAdd} style={{padding:'10px 14px',background:'var(--brand-primary)',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer'}}><Plus size={16} /></button>
      </div>
      {tagList.length > 0 && <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'8px'}}>
        {tagList.map(v=>(
          <span key={v} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'rgba(108,92,231,0.1)',color:'var(--brand-primary-light)',borderRadius:'16px',fontSize:'0.8rem',fontWeight:600}}>
            {v} <button type="button" onClick={()=>removeTag(field,v)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--brand-primary-light)',padding:0,display:'inline-flex'}}><Trash2 size={12} /></button>
          </span>
        ))}
      </div>}
    </div>
  )

  return (
    <div style={{padding:'24px 0'}}>
      <h2 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:'24px',color:'var(--text-primary)'}}>Job Details</h2>

      <Section title="Job Description">
        <div style={{marginBottom:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <label style={labelStyle}>Description <span style={{color:'#EF4444'}}>*</span></label>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); handleZoe('description'); }} disabled={zoeLoading === 'description'}
              style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'0.8rem',fontWeight:600,
                background:'rgba(108,92,231,0.1)',color:'var(--brand-primary)',border:'1px solid var(--brand-primary)',
                borderRadius:'6px',cursor:'pointer',opacity:zoeLoading==='description'?0.6:1}}>
              {zoeLoading === 'description' ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}} /> : <Sparkles size={14} />}
              Zoe Write
            </button>
          </div>
          <textarea value={job.description || ''} onChange={e=>updateJob({description:e.target.value})} rows={6}
            placeholder="Write a compelling job description. What does this role do? Why is it important? What will the candidate accomplish?"
            style={{...inputStyle('description'),minHeight:'140px',resize:'vertical'}} />
          {errors.description && <span style={errorStyle}>{errors.description}</span>}
          <p style={{fontSize:'0.75rem',color:'var(--text-tertiary)',marginTop:'4px'}}>Tip: Be specific about day-to-day activities and impact on the team.</p>
        </div>
      </Section>

      <Section title="Responsibilities">
        <div style={{marginBottom:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <label style={labelStyle}>Key Responsibilities <span style={{color:'#EF4444'}}>*</span></label>
            <button type="button" onClick={(e)=>{ e.stopPropagation(); handleZoe('responsibilities'); }} disabled={zoeLoading === 'responsibilities'}
              style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'0.8rem',fontWeight:600,
                background:'rgba(108,92,231,0.1)',color:'var(--brand-primary)',border:'1px solid var(--brand-primary)',
                borderRadius:'6px',cursor:'pointer',opacity:zoeLoading==='responsibilities'?0.6:1}}>
              {zoeLoading === 'responsibilities' ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}} /> : <Sparkles size={14} />}
              Zoe Write
            </button>
          </div>
          <textarea value={job.responsibilities || ''} onChange={e=>updateJob({responsibilities:e.target.value})} rows={5}
            placeholder="List the key responsibilities and expectations for this role. What will the candidate own?"
            style={{...inputStyle('responsibilities'),minHeight:'120px',resize:'vertical'}} />
          {errors.responsibilities && <span style={errorStyle}>{errors.responsibilities}</span>}
        </div>
      </Section>

      <Section title="Requirements">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
          <label style={labelStyle}>Must-Have Requirements <span style={{color:'#EF4444'}}>*</span></label>
          <button type="button" onClick={(e)=>{ e.stopPropagation(); handleZoe('requirements'); }} disabled={zoeLoading === 'requirements'}
            style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',fontSize:'0.8rem',fontWeight:600,
              background:'rgba(108,92,231,0.1)',color:'var(--brand-primary)',border:'1px solid var(--brand-primary)',
              borderRadius:'6px',cursor:'pointer',opacity:zoeLoading==='requirements'?0.6:1}}>
            {zoeLoading === 'requirements' ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}} /> : <Sparkles size={14} />}
            Zoe Write
          </button>
        </div>
        <TagInput label="" value={newMustHave} onChange={setNewMustHave} field="mustHave"
          placeholder="e.g. 5+ years React experience, AWS certification" tagList={mustHave}
          onAdd={()=>addTag('mustHave',newMustHave,setNewMustHave)} />

        <TagInput label="Nice-to-Have (Preferred)" value={newNiceToHave} onChange={setNewNiceToHave} field="niceToHave"
          placeholder="e.g. Experience with GraphQL, Open source contributions" tagList={niceToHave}
          onAdd={()=>addTag('niceToHave',newNiceToHave,setNewNiceToHave)} />
      </Section>
    </div>
  )
}
