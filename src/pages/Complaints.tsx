import React, { useMemo, useRef, useState } from 'react'
import {
  COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, Complaint, ComplaintCategory, Priority, STUDENTS,
  statusLabel,
} from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { Button, EmptyState, Field, SectionHead, StatCard, StatusBadge, Tabs } from '../lib/ui'
import { canViewPrivateDetails, useApp } from '../lib/store'

const CATEGORY_ICON: Record<ComplaintCategory, IconName> = {
  Cleaning: 'sparkle',
  Water: 'droplet',
  Electricity: 'zap',
  'Wi-Fi': 'wifi',
  Mess: 'utensils',
  'Room Maintenance': 'building',
  Security: 'shield',
  Other: 'info',
}

const priorityTone: Record<Priority, string> = { high: 'full', medium: 'pending', low: 'reserved' }

export function Complaints() {
  const { complaints, submitComplaint, setComplaintStatus, user, toast, confirm } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const me = STUDENTS.find((s) => s.id === user?.studentId)
  const isStaff = user?.role === 'warden' || user?.role === 'admin'

  const [category, setCategory] = useState<ComplaintCategory>('Cleaning')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [roomNumber, setRoomNumber] = useState(me ? `${me.roomId}` : '')
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | Complaint['status']>('all')
  const [search, setSearch] = useState('')
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return complaints
      .filter((c) => (filter === 'all' ? true : c.status === filter))
      .filter((c) => (q ? `${c.ticket} ${c.title} ${c.category} ${c.roomNumber} ${c.raisedBy}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [complaints, filter, search])

  const counts = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    active: complaints.filter((c) => c.status === 'assigned' || c.status === 'inprogress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  }), [complaints])

  const validate = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 6) e.title = 'Give a short, specific title (at least 6 characters).'
    if (description.trim().length < 15) e.description = 'Describe the issue in at least 15 characters so staff can act quickly.'
    if (!/^[A-Za-z]{2,4}-?[A-Za-z0-9]{2,5}$/.test(roomNumber.trim())) e.roomNumber = 'Use a room number like ARV-201, NLG-104 or VND-303.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) {
      toast('error', 'Please fix the highlighted fields', 'The complaint was not submitted.')
      return
    }
    const created = submitComplaint({
      category, title: title.trim(), description: description.trim(), priority,
      roomNumber: roomNumber.trim().toUpperCase(), imageName: fileName || undefined,
    })
    setJustSubmitted(created.id)
    setTitle(''); setDescription(''); setFileName('')
    if (fileRef.current) fileRef.current.value = ''
    toast('success', `Ticket ${created.ticket} created`, 'Your complaint is queued with the warden office. Track it below.')
    window.setTimeout(() => {
      document.getElementById('complaint-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const reopen = async (c: Complaint) => {
    const ok = await confirm({
      title: `Reopen ticket ${c.ticket}?`,
      message: 'Reopening alerts the warden that the issue is unresolved and restarts the response clock. Use it only if the problem persists.',
      confirmLabel: 'Reopen ticket',
    })
    if (ok) setComplaintStatus(c.id, 'reopened', me?.name ?? user?.name ?? 'Resident', 'Issue reported as unresolved by the resident.')
  }

  const advance = (c: Complaint, next: Complaint['status']) => {
    setComplaintStatus(c.id, next, user?.name ?? 'Warden Office', `Updated by ${user?.title ?? 'hostel staff'}.`)
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Complaint desk"
        title="Report it once, track it to resolution"
        sub="Cleaning, water, electricity, Wi-Fi, mess, room maintenance and security issues all land in one queue — with timestamps, ownership and status history."
        right={<span className="chip-tag cyan"><Icon name="shield" size={12} /> Tickets visible to you, your warden and the admin</span>}
      />

      <div className="grid g4" style={{ marginBottom: 26 }}>
        <StatCard label="Total tickets" value={counts.total} icon="clipboard" foot="Last 90 days across all blocks" />
        <StatCard label="Pending" value={counts.pending} tone="warn" icon="clock" foot="Awaiting assignment" />
        <StatCard label="In progress" value={counts.active} tone="info" icon="activity" foot="Assigned to a team" />
        <StatCard label="Resolved" value={counts.resolved} tone="ok" icon="check" foot="Closed by the warden office" />
      </div>

      <div className={user?.role === 'admin' || user?.role === 'warden' ? '' : 'split'}>
        {/* ------------------------- Submit form ------------------------- */}
        {user?.role !== 'admin' && user?.role !== 'warden' && (
        <form className="card" onSubmit={onSubmit} noValidate aria-labelledby="raise-complaint">
          <div className="card-title" style={{ marginBottom: 14 }}><Icon name="plus" size={17} /> <span id="raise-complaint">Raise a complaint</span></div>

          {!user && (
            <div className="notice-strip" style={{ marginBottom: 14 }}>
              <Icon name="info" size={16} />
              <span className="small">You are not signed in. Your ticket will be filed as a guest — sign in as <b>student@roh.demo</b> to link it to your room.</span>
            </div>
          )}

          <div className="col" style={{ gap: 14 }}>
            <Field label="Category" id="c-category">
              <select id="c-category" className="select" value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
                {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Title" id="c-title" error={errors.title} hint="Short and specific works best">
              <input
                id="c-title" className="input" value={title} maxLength={90}
                onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tap in washroom leaking continuously"
                aria-invalid={!!errors.title}
              />
            </Field>

            <Field label="Description" id="c-desc" error={errors.description}>
              <textarea
                id="c-desc" className="textarea" value={description} maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add what happened, since when, and any detail that helps the technician."
                aria-invalid={!!errors.description}
              />
            </Field>

            <div className="field">
              <label>Priority</label>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button key={p} type="button" className={`chip ${priority === p ? 'on' : ''}`} aria-pressed={priority === p} onClick={() => setPriority(p)}>
                    {p === 'high' && <Icon name="alert" size={12} />} {p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Room number" id="c-room" error={errors.roomNumber} hint="Format: BLOCK-FLOORROOM, e.g. ARV-201">
              <input
                id="c-room" className="input" value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)} placeholder="ARV-201"
                aria-invalid={!!errors.roomNumber}
              />
            </Field>

            <div className="field">
              <label htmlFor="c-file">Photo evidence (optional)</label>
              <input
                id="c-file" ref={fileRef} className="input" type="file" accept="image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                style={{ paddingTop: 9, paddingBottom: 9 }}
              />
              {fileName && (
                <span className="row tiny" style={{ gap: 8, color: 'var(--ok)' }}>
                  <Icon name="check" size={13} /> {fileName} attached (demo — stored in memory only)
                </span>
              )}
            </div>

            <Button variant="primary" type="submit" icon="upload" block>Submit complaint</Button>
            <p className="tiny dim" style={{ margin: 0 }}>
              Demo mode: tickets persist in your browser only. Connect the API layer to route them to the estate database.
            </p>
          </div>
        </form>
        )}

        {/* --------------------------- History --------------------------- */}
        <div id="complaint-history">
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div className="search grow" style={{ minWidth: 200 }}>
                <Icon name="search" size={17} />
                <input
                  className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ticket, title, room or category…" aria-label="Search complaints"
                />
              </div>
              <Tabs
                ariaLabel="Filter complaints by status"
                tabs={[{ id: 'all', label: 'All', count: complaints.length }, ...COMPLAINT_STATUSES.map((s) => ({ id: s, label: statusLabel[s], count: complaints.filter((c) => c.status === s).length }))]}
                value={filter}
                onChange={setFilter}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="clipboard" title="No complaints match this view"
              message="Change the status filter or clear the search to see the full ticket history."
              action={<Button variant="primary" icon="refresh" onClick={() => { setFilter('all'); setSearch('') }}>Reset filters</Button>}
            />
          ) : (
            <div className="col" style={{ gap: 14 }}>
              {visible.map((c) => {
                const mine = c.studentId === user?.studentId
                const canModerate = isStaff || mine
                // Privacy: only the ticket owner, warden and admin see the complainant's name.
                const raiser = canViewPrivateDetails(user, c.studentId)
                  ? (mine ? `${c.raisedBy} (you)` : c.raisedBy)
                  : `Resident · Room ${c.roomNumber}`
                return (
                  <article
                    className={`card ${justSubmitted === c.id ? 'anim-up glowing' : ''}`}
                    key={c.id}
                    aria-labelledby={`ticket-${c.id}`}
                  >
                    <div className="row-between" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(147,168,255,0.1)', border: '1px solid var(--stroke)', color: 'var(--blue-2)', flex: 'none' }}>
                          <Icon name={CATEGORY_ICON[c.category]} size={20} />
                        </span>
                        <div>
                          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <b id={`ticket-${c.id}`}>{c.title}</b>
                            <span className={`badge ${priorityTone[c.priority]}`}><i className="dot" />{c.priority} priority</span>
                          </div>
                          <div className="tiny muted" style={{ marginTop: 5 }}>
                            <span className="mono">{c.ticket}</span> · {c.category} · Room {c.roomNumber} · raised by {raiser} · {new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <p className="small" style={{ marginBottom: 12 }}>{c.description}</p>

                    {c.assignedTo && (
                      <div className="row tiny" style={{ gap: 8, marginBottom: 12, color: 'var(--text-2)' }}>
                        <Icon name="users" size={14} /> Assigned to <b>{c.assignedTo}</b>
                      </div>
                    )}

                    <details>
                      <summary className="link-btn small" style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <Icon name="clock" size={14} style={{ verticalAlign: '-2px' }} /> Tracking timeline ({c.timeline.length} updates)
                      </summary>
                      <div className="timeline" style={{ marginTop: 16 }}>
                        {c.timeline.map((t, i) => (
                          <div className="tl-item" key={`${t.at}-${i}`}>
                            <span className={`tl-dot ${i === c.timeline.length - 1 ? '' : 'done'}`} />
                            <div className="row-between" style={{ gap: 10, flexWrap: 'wrap' }}>
                              <b className="small">{t.label}</b>
                              <span className="tiny dim">{new Date(t.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <div className="tiny muted">
                              by {canViewPrivateDetails(user, c.studentId) || t.by !== c.raisedBy ? t.by : 'Resident'}
                              {t.note ? ` · ${t.note}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>

                    {canModerate && (
                      <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                        {isStaff && c.status !== 'assigned' && c.status !== 'resolved' && (
                          <Button size="xs" variant="ghost" icon="users" onClick={() => advance(c, 'assigned')}>Mark assigned</Button>
                        )}
                        {isStaff && c.status !== 'inprogress' && c.status !== 'resolved' && (
                          <Button size="xs" variant="ghost" icon="activity" onClick={() => advance(c, 'inprogress')}>Mark in progress</Button>
                        )}
                        {isStaff && c.status !== 'resolved' && (
                          <Button size="xs" variant="primary" icon="check" onClick={() => advance(c, 'resolved')}>Mark resolved</Button>
                        )}
                        {!isStaff && mine && c.status === 'resolved' && (
                          <Button size="xs" variant="warn" icon="refresh" onClick={() => reopen(c)}>Issue persists — reopen</Button>
                        )}
                        {mine && <span className="tiny dim row" style={{ gap: 6 }}><Icon name="shield" size={13} /> Your ticket</span>}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
