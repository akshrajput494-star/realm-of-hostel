import React, { useMemo, useState } from 'react'
import { Notice, todayLong } from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { Button, EmptyState, Field, Modal, SectionHead, Tabs } from '../lib/ui'
import { useApp } from '../lib/store'

const CATEGORY_META: Record<Notice['category'], { icon: IconName; color: string }> = {
  General: { icon: 'info', color: 'var(--blue-2)' },
  Maintenance: { icon: 'zap', color: 'var(--warn)' },
  Mess: { icon: 'utensils', color: 'var(--violet-2)' },
  Fees: { icon: 'wallet', color: 'var(--ok)' },
  Transport: { icon: 'bus', color: 'var(--info)' },
  Event: { icon: 'sparkle', color: 'var(--pink)' },
  Safety: { icon: 'shield', color: 'var(--danger)' },
}

export function Notices() {
  const { notices, addNotice, removeNotice, user, confirm, toast } = useApp()
  const isStaff = user?.role === 'warden' || user?.role === 'admin'

  const [filter, setFilter] = useState<'all' | Notice['category']>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'General' as Notice['category'], audience: 'All residents', pinned: false })
  const [error, setError] = useState('')

  const categories = useMemo(() => Array.from(new Set(notices.map((n) => n.category))), [notices])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notices
      .filter((n) => (filter === 'all' ? true : n.category === filter))
      .filter((n) => (q ? `${n.title} ${n.body} ${n.by} ${n.audience}`.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))
  }, [notices, filter, search])

  const publish = () => {
    if (form.title.trim().length < 8) { setError('Give the notice a descriptive title (at least 8 characters).'); return }
    if (form.body.trim().length < 20) { setError('Add at least 20 characters of detail so residents know what to do.'); return }
    setError('')
    addNotice({ ...form, date: new Date().toISOString().slice(0, 10), by: user?.title ?? 'Warden Office' })
    setForm({ title: '', body: '', category: 'General', audience: 'All residents', pinned: false })
    setOpen(false)
  }

  const takeDown = async (n: Notice) => {
    const ok = await confirm({
      title: 'Take down this notice?',
      message: `“${n.title}” will be removed from the public notice board immediately. Residents who already read it will lose access.`,
      confirmLabel: 'Take down',
      danger: true,
    })
    if (ok) removeNotice(n.id)
  }

  const pinned = visible.filter((n) => n.pinned)
  const rest = visible.filter((n) => !n.pinned)

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Notice board"
        title="Official hostel notices"
        sub={`Every circular from the warden office, mess committee, accounts and transport desk — dated and attributed. Today is ${todayLong()}.`}
        right={
          isStaff
            ? <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Publish notice</Button>
            : <span className="chip-tag cyan"><Icon name="bell" size={12} /> {notices.length} active notices</span>
        }
      />

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="search grow" style={{ minWidth: 220 }}>
            <Icon name="search" size={17} />
            <input
              className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices by title, body or department…" aria-label="Search notices"
            />
          </div>
          <Tabs
            ariaLabel="Filter notices by category"
            tabs={[{ id: 'all', label: 'All', count: notices.length }, ...categories.map((c) => ({ id: c, label: c, count: notices.filter((n) => n.category === c).length }))]}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="bell" title="No notices match this filter"
          message="Try another category or clear the search box to see the full notice board."
          action={<Button variant="primary" icon="refresh" onClick={() => { setFilter('all'); setSearch('') }}>Reset</Button>}
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <div className="row" style={{ gap: 8, marginBottom: 14 }}>
                <Icon name="alert" size={15} />
                <b className="small" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pinned & time-sensitive</b>
              </div>
              <div className="grid g2" style={{ marginBottom: 30 }}>
                {pinned.map((n) => <NoticeCard key={n.id} notice={n} featured onRemove={isStaff ? takeDown : undefined} />)}
              </div>
            </>
          )}

          <div className="grid g3 stagger">
            {rest.map((n) => <NoticeCard key={n.id} notice={n} onRemove={isStaff ? takeDown : undefined} />)}
          </div>
        </>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setError('') }}
        title="Publish a hostel notice"
        subtitle="Notices appear instantly on the public board, the dashboard and the homepage strip."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary" icon="upload"
              onClick={publish}
            >
              Publish notice
            </Button>
          </>
        }
      >
        <div className="col" style={{ gap: 16 }}>
          <Field label="Notice title" id="n-title" error={error && form.title.trim().length < 8 ? error : undefined}>
            <input
              id="n-title" className="input" value={form.title} maxLength={110}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Water supply shutdown on Floor 2, 14 Sept 09:00–13:00"
            />
          </Field>

          <div className="grid g2" style={{ gap: 14 }}>
            <Field label="Category" id="n-category">
              <select id="n-category" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Notice['category'] })}>
                {Object.keys(CATEGORY_META).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Audience" id="n-audience">
              <select id="n-audience" className="select" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {['All residents', 'Aravalli Block', 'Nilgiri Block', 'Vindhya Block', 'First-year students', 'Mess committee'].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notice body" id="n-body" error={error && form.body.trim().length < 20 ? error : undefined}>
            <textarea
              id="n-body" className="textarea" value={form.body} maxLength={600}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Explain what is happening, when, and what residents should do."
            />
          </Field>

          <label className="switch">
            <input
              type="checkbox" checked={form.pinned} style={{ width: 17, height: 17, accentColor: '#8b5cf6' }}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            />
            Pin this notice to the top of the board
          </label>
        </div>
      </Modal>
    </div>
  )
}

function NoticeCard({ notice, featured, onRemove }: { notice: Notice; featured?: boolean; onRemove?: (n: Notice) => void }) {
  const meta = CATEGORY_META[notice.category]
  return (
    <article className={`card hoverable ${featured ? 'glowing' : ''}`} aria-labelledby={`notice-${notice.id}`}>
      <div className="row-between" style={{ gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
          <span style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(147,168,255,0.1)', border: '1px solid var(--stroke)', color: meta.color, flex: 'none' }}>
            <Icon name={meta.icon} size={19} />
          </span>
          <div>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              <span className="chip-tag">{notice.category}</span>
              {notice.pinned && <span className="chip-tag violet"><Icon name="alert" size={11} /> Pinned</span>}
            </div>
            <h3 id={`notice-${notice.id}`} style={{ fontSize: '1rem', margin: '8px 0 4px' }}>{notice.title}</h3>
          </div>
        </div>
        {onRemove && (
          <button className="modal-x" onClick={() => onRemove(notice)} aria-label={`Take down notice: ${notice.title}`} title="Take down notice">
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      <p className="small" style={{ marginBottom: 12 }}>{notice.body}</p>

      <div className="row-between tiny muted" style={{ gap: 10, flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 12 }}>
          <span><Icon name="calendar" size={12} style={{ verticalAlign: '-2px' }} /> {new Date(notice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          <span><Icon name="user" size={12} style={{ verticalAlign: '-2px' }} /> {notice.by}</span>
        </span>
        <span className="chip-tag">{notice.audience}</span>
      </div>
    </article>
  )
}
