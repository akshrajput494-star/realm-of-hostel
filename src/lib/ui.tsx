import React, { useEffect, useRef } from 'react'
import { Icon, IconName } from './icons'
import { Toast, useApp } from './store'
import { RoomStatus, statusLabel } from '../data/mock'
import { Link } from './router'

/* =========================================================================
   Reusable UI primitives for ROH
   ========================================================================= */

/* ------------------------------- Toaster -------------------------------- */
const toastIcon: Record<Toast['kind'], IconName> = {
  success: 'check', error: 'alert', info: 'info', warn: 'alert',
}

export function Toaster() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span className="ti"><Icon name={toastIcon[t.kind]} size={16} /></span>
          <div className="grow">
            <b>{t.title}</b>
            {t.message && <p>{t.message}</p>}
          </div>
          <button className="tc" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------- Button -------------------------------- */
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'warn' | 'pink'
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'xs' | 'sm' | 'md' | 'lg'
  icon?: IconName
  iconRight?: IconName
  block?: boolean
}
export function Button({ variant = 'ghost', size = 'md', icon, iconRight, block, children, className = '', ...rest }: BtnProps) {
  const cls = ['btn', `btn-${variant === 'ghost' ? 'ghost' : variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 19 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 19 : 16} />}
    </button>
  )
}

/** Button-styled router link (keeps markup semantic: real <a> elements). */
interface LinkBtnProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  variant?: BtnVariant
  size?: 'xs' | 'sm' | 'md' | 'lg'
  icon?: IconName
  iconRight?: IconName
  block?: boolean
}
export function LinkButton({
  to, variant = 'ghost', size = 'md', icon, iconRight, block, children, className = '', ...rest
}: LinkBtnProps) {
  const cls = ['btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ')
  return (
    <Link to={to} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 19 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 19 : 16} />}
    </Link>
  )
}

/* -------------------------------- Badges -------------------------------- */
export function StatusBadge({ status, className = '' }: { status: RoomStatus | string; className?: string }) {
  return (
    <span className={`badge ${status} ${className}`}>
      <i className="dot" />
      {statusLabel[status] ?? status}
    </span>
  )
}

export function BedBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}><i className="dot" />{statusLabel[status] ?? status}</span>
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: 'violet' | 'cyan' | 'blue' }) {
  return <span className={`chip-tag ${tone ?? ''}`}>{children}</span>
}

/* ------------------------------- Stat card ------------------------------ */
export function StatCard({
  label, value, foot, icon, tone = 'default', spark, compact,
}: {
  label: string; value: React.ReactNode; foot?: React.ReactNode
  icon?: IconName; tone?: 'default' | 'ok' | 'warn' | 'danger' | 'info'; spark?: React.ReactNode
  /** Use for composite values such as "ARV-G01 · B3" so they stay on one line. */
  compact?: boolean
}) {
  const toneColor = { default: 'var(--violet-2)', ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', info: 'var(--info)' }[tone]
  return (
    <div className="stat">
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <div className={`stat-num ${compact ? 'sm' : ''}`}>{value}</div>
        {icon && (
          <span style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(147,168,255,0.1)', border: '1px solid var(--stroke)', color: toneColor, flex: 'none' }}>
            <Icon name={icon} size={19} />
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      {spark && <div style={{ marginTop: 8 }}>{spark}</div>}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

/* ------------------------------ Section head ---------------------------- */
export function SectionHead({
  eyebrow, title, sub, right, id,
}: { eyebrow?: string; title: string; sub?: string; right?: React.ReactNode; id?: string }) {
  return (
    <div className="row-between" style={{ alignItems: 'flex-end', gap: 20, marginBottom: 22, flexWrap: 'wrap' }} id={id}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        {eyebrow && <div className="kicker-num" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2>{title}</h2>
        {sub && <p className="small muted" style={{ margin: '8px 0 0' }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* --------------------------------- Modal -------------------------------- */
export function Modal({
  open, onClose, title, subtitle, children, footer, size = 'md', labelledBy = 'roh-modal-title',
}: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode
  children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg'; labelledBy?: string
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="modal-scrim"
      role="dialog" aria-modal="true" aria-labelledby={labelledBy}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`modal ${size}`}>
        <div className="modal-head">
          <div>
            <h3 id={labelledBy} style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h3>
            {subtitle && <p className="small muted" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          <button ref={closeRef} className="modal-x" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------ Empty / error --------------------------- */
export function EmptyState({
  icon = 'search', title, message, action,
}: { icon?: IconName; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ico"><Icon name={icon} size={28} /></div>
      <div>
        <h3 style={{ marginBottom: 6 }}>{title}</h3>
        {message && <p className="small muted" style={{ margin: 0, maxWidth: '46ch' }}>{message}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <Icon name="alert" size={22} />
      <div className="grow">
        <b>{title}</b>
        {message && <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#ffd6dc' }}>{message}</p>}
      </div>
      {onRetry && <Button variant="ghost" size="sm" icon="refresh" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

/* -------------------------------- Loading ------------------------------- */
export function LoadingBlock({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="loader-block" role="status" aria-live="polite">
      <div className="spinner" />
      <span className="small">{label}</span>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <div className="skeleton" style={{ height: 22, width: '42%', marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 18 }} />
      <div className="grid g3" style={{ gap: 10, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}
      </div>
      <div className="skeleton" style={{ height: 38 }} />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return <div className="grid g-auto-300">{Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}</div>
}

/* -------------------------------- Tabs ---------------------------------- */
export function Tabs<T extends string>({
  tabs, value, onChange, ariaLabel,
}: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; ariaLabel: string }) {
  return (
    <div className="day-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id}
          className={`chip ${value === t.id ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span style={{ opacity: 0.75, fontWeight: 700 }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ Progress -------------------------------- */
export function Progress({ pct, tone = '', label }: { pct: number; tone?: '' | 'ok' | 'warn' | 'danger'; label?: string }) {
  return (
    <div>
      <div className="bar-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'progress'}>
        <div className={`bar-fill ${tone}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
      </div>
      {label && <div className="row-between tiny muted" style={{ marginTop: 6 }}><span>{label}</span><b>{Math.round(pct)}%</b></div>}
    </div>
  )
}

/* ------------------------------- Fields --------------------------------- */
export function Field({
  label, hint, error, children, id,
}: { label: string; hint?: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="tiny dim">{hint}</span>}
      {error && <span className="tiny" style={{ color: 'var(--danger)' }} role="alert">{error}</span>}
    </div>
  )
}

/* ------------------------------- KV list -------------------------------- */
export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="kv">
      {rows.map(([k, v], i) => (
        <div className="kv-row" key={`${k}-${i}`}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ Rating ---------------------------------- */
export function Rating({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="rating" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" className={n <= value ? 'on' : ''}
          aria-label={`${n} star${n > 1 ? 's' : ''}`} disabled={readOnly}
          onClick={() => onChange?.(n)} style={readOnly ? { cursor: 'default' } : undefined}
        >
          <Icon name="star" size={19} />
        </button>
      ))}
    </div>
  )
}

/* --------------------------- Privacy callout ---------------------------- */
export function PrivacyNote({ compact }: { compact?: boolean }) {
  return (
    <div className="privacy-note">
      <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(139,92,246,0.2)', color: 'var(--violet-2)', flex: 'none' }}>
        <Icon name="lock" size={20} />
      </span>
      <div>
        <b style={{ display: 'block', marginBottom: 4 }}>Your privacy is protected by design</b>
        <p className="small muted" style={{ margin: 0 }}>
          {compact
            ? 'Bed availability is public. Student names, roll numbers and academic details are visible only to the assigned student, warden and administrator.'
            : 'ROH separates public room data from private resident data. Visitors see only bed status — never a name, roll number, course, academic year, contact or guardian detail. Personal records unlock only for the assigned student, the warden and the administrator, and every access is logged.'}
        </p>
      </div>
    </div>
  )
}
