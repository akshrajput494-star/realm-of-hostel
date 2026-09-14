import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  AuthUser, Complaint, DEMO_ACCOUNTS, Payment, Room, Role, SEED_COMPLAINTS, SEED_PAYMENTS,
  SEED_NOTICES, Notice, STUDENTS, Student, bedCounts, roomStatus,
} from '../data/mock'
import { Icon } from './icons'

/* =========================================================================
   Application state
   Everything lives behind this single store so the mock layer can later be
   swapped for real API calls without touching a single page component.
   ========================================================================= */

export interface RoomApplication {
  id: string
  roomId: string
  studentId: string
  studentName: string
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted'
  appliedAt: string
  note?: string
}

export type ToastKind = 'success' | 'error' | 'info' | 'warn'
export interface Toast { id: number; kind: ToastKind; title: string; message?: string }

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface StoreValue {
  /* auth */
  user: AuthUser | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  loginAs: (email: string) => void
  logout: () => void
  /* rooms */
  shortlist: string[]
  toggleShortlist: (roomId: string) => void
  isShortlisted: (roomId: string) => boolean
  compare: string[]
  toggleCompare: (roomId: string) => void
  clearCompare: () => void
  /* applications */
  applications: RoomApplication[]
  applyForRoom: (room: Room, note?: string) => void
  decideApplication: (id: string, status: RoomApplication['status']) => void
  /* complaints */
  complaints: Complaint[]
  submitComplaint: (input: Omit<Complaint, 'id' | 'ticket' | 'createdAt' | 'status' | 'timeline' | 'raisedBy' | 'studentId'>) => Complaint
  setComplaintStatus: (id: string, status: Complaint['status'], by: string, note?: string) => void
  /* payments */
  payments: Payment[]
  payNow: (amount: number, mode: string, term: string) => Payment
  /* notices */
  notices: Notice[]
  addNotice: (n: Omit<Notice, 'id'>) => void
  removeNotice: (id: string) => void
  /* students */
  students: Student[]
  addStudent: (input: Omit<Student, 'id' | 'avatar' | 'attendancePct'>) => Student
  removeStudent: (id: string) => void
  /* ui */
  theme: 'dark' | 'light'
  toggleTheme: () => void
  toasts: Toast[]
  toast: (kind: ToastKind, title: string, message?: string) => void
  dismissToast: (id: number) => void
  confirm: (req: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>
  confirmState: ConfirmRequest | null
  resolveConfirm: (ok: boolean) => void
  resetDemoData: () => void
}

const StoreCtx = createContext<StoreValue | null>(null)

export function useApp() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useApp must be used inside <StoreProvider>')
  return ctx
}

/* ---------- persistence helpers (front-end only demo store) ------------- */
const KEYS = {
  user: 'roh.v1.user',
  theme: 'roh.v1.theme',
  shortlist: 'roh.v1.shortlist',
  compare: 'roh.v1.compare',
  applications: 'roh.v1.applications',
  complaints: 'roh.v1.complaints',
  payments: 'roh.v1.payments',
  notices: 'roh.v1.notices',
  students: 'roh.v1.students',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota / private mode */ }
}

/** Simulated network latency so loading states are meaningful and honest. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let toastSeq = 1
let appSeq = 100

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => load<'dark' | 'light'>(KEYS.theme, 'dark'))
  const [user, setUser] = useState<AuthUser | null>(() => load<AuthUser | null>(KEYS.user, null))
  const [shortlist, setShortlist] = useState<string[]>(() => load<string[]>(KEYS.shortlist, ['ARV-103', 'NLG-201']))
  const [compare, setCompare] = useState<string[]>(() => load<string[]>(KEYS.compare, []))
  const [applications, setApplications] = useState<RoomApplication[]>(() => load<RoomApplication[]>(KEYS.applications, [
    { id: 'A-01', roomId: 'ARV-103', studentId: 'S-1009', studentName: 'Vihaan Gupta', status: 'pending', appliedAt: '2026-09-10T11:20:00', note: 'Requesting AC 3-seater near study hall.' },
    { id: 'A-02', roomId: 'NLG-202', studentId: 'S-1011', studentName: 'Arjun Bose', status: 'waitlisted', appliedAt: '2026-09-09T15:05:00' },
  ]))
  const [complaints, setComplaints] = useState<Complaint[]>(() => load<Complaint[]>(KEYS.complaints, SEED_COMPLAINTS))
  const [payments, setPayments] = useState<Payment[]>(() => load<Payment[]>(KEYS.payments, SEED_PAYMENTS))
  const [notices, setNotices] = useState<Notice[]>(() => load<Notice[]>(KEYS.notices, SEED_NOTICES))
  const [students, setStudents] = useState<Student[]>(() => load<Student[]>(KEYS.students, STUDENTS))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    save(KEYS.theme, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => save(KEYS.user, user), [user])
  useEffect(() => save(KEYS.shortlist, shortlist), [shortlist])
  useEffect(() => save(KEYS.compare, compare), [compare])
  useEffect(() => save(KEYS.applications, applications), [applications])
  useEffect(() => save(KEYS.complaints, complaints), [complaints])
  useEffect(() => save(KEYS.payments, payments), [payments])
  useEffect(() => save(KEYS.notices, notices), [notices])
  useEffect(() => save(KEYS.students, students), [students])

  /* ----------------------------- toasts ------------------------------- */
  const timers = useRef<number[]>([])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = toastSeq++
    setToasts((t) => [...t.slice(-3), { id, kind, title, message }])
    const handle = window.setTimeout(() => dismissToast(id), kind === 'error' ? 6500 : 4600)
    timers.current.push(handle)
  }, [dismissToast])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  /* --------------------------- confirmation --------------------------- */
  const confirm = useCallback((req: Omit<ConfirmRequest, 'resolve'>) => (
    new Promise<boolean>((resolve) => setConfirmState({ ...req, resolve }))
  ), [])
  const resolveConfirm = useCallback((ok: boolean) => {
    setConfirmState((prev) => { prev?.resolve(ok); return null })
  }, [])

  /* -------------------------------- auth ------------------------------ */
  const loginAs = useCallback((email: string) => {
    const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
    if (account) {
      setUser(account)
      toast('success', `Welcome, ${account.name.split(' ')[0]}`, `Signed in as ${account.title}.`)
    }
  }, [toast])

  const login = useCallback((identifier: string, password: string) => {
    const trimmed = identifier.trim()
    if (!trimmed || trimmed.length < 5) return { ok: false, error: 'Enter a valid phone number.' }
    if (password.length < 3) return { ok: false, error: 'Password must be at least 3 characters (demo mode).' }
    const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === trimmed.toLowerCase()) ?? DEMO_ACCOUNTS[0]
    setUser(account)
    toast('success', `Welcome back, ${account.name}`, `You are signed in as ${account.title}.`)
    return { ok: true }
  }, [toast])

  const logout = useCallback(() => {
    setUser(null)
    setCompare([])
    toast('info', 'Signed out', 'You are browsing as a visitor. Bed status is still public — student details are hidden.')
  }, [toast])

  /* ------------------------------- rooms ------------------------------ */
  const toggleShortlist = useCallback((roomId: string) => {
    setShortlist((list) => {
      const has = list.includes(roomId)
      toast(has ? 'info' : 'success', has ? 'Removed from shortlist' : 'Added to shortlist', `Room ${roomId} ${has ? 'removed' : 'saved'} to your shortlist.`)
      return has ? list.filter((r) => r !== roomId) : [...list, roomId]
    })
  }, [toast])

  const toggleCompare = useCallback((roomId: string) => {
    setCompare((list) => {
      if (list.includes(roomId)) return list.filter((r) => r !== roomId)
      if (list.length >= 3) {
        toast('warn', 'Compare list full', 'You can compare up to 3 rooms at a time. Remove one to add another.')
        return list
      }
      toast('success', 'Added to compare', `Room ${roomId} added. ${list.length + 1}/3 selected.`)
      return [...list, roomId]
    })
  }, [toast])

  const clearCompare = useCallback(() => setCompare([]), [])

  /* --------------------------- applications --------------------------- */
  const applyForRoom = useCallback((room: Room, note?: string) => {
    const me = STUDENTS.find((s) => s.id === user?.studentId)
    const app: RoomApplication = {
      id: `A-${++appSeq}`,
      roomId: room.id,
      studentId: user?.studentId ?? 'S-1001',
      studentName: me?.name ?? user?.name ?? 'Guest User',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      note,
    }
    setApplications((a) => [app, ...a])
    toast('success', 'Application submitted', `Request for room ${room.number} sent to the warden for approval.`)
  }, [toast, user])

  const decideApplication = useCallback((id: string, status: RoomApplication['status']) => {
    setApplications((list) => list.map((a) => (a.id === id ? { ...a, status } : a)))
    toast(status === 'approved' ? 'success' : 'info', `Application ${status}`, `Request ${id} marked ${status}.`)
  }, [toast])

  /* ---------------------------- complaints ---------------------------- */
  const submitComplaint = useCallback<StoreValue['submitComplaint']>((input) => {
    const me = STUDENTS.find((s) => s.id === user?.studentId)
    const c: Complaint = {
      ...input,
      id: `C-${++appSeq}`,
      ticket: `ROH-${4500 + (appSeq % 400)}`,
      raisedBy: me?.name ?? user?.name ?? 'Guest User',
      studentId: user?.studentId ?? 'GUEST',
      createdAt: new Date().toISOString(),
      status: 'pending',
      timeline: [{ at: new Date().toISOString(), label: 'Complaint raised', by: me?.name ?? user?.name ?? 'Guest User' }],
    }
    setComplaints((list) => [c, ...list])
    return c
  }, [user])

  const setComplaintStatus = useCallback<StoreValue['setComplaintStatus']>((id, status, by, note) => {
    setComplaints((list) => list.map((c) => (c.id === id
      ? {
        ...c,
        status,
        timeline: [...c.timeline, { at: new Date().toISOString(), label: `Marked ${status}`, by, note }],
      }
      : c)))
    toast('success', 'Complaint updated', `Ticket marked as ${status}.`)
  }, [toast])

  /* ------------------------------ payments ---------------------------- */
  const payNow = useCallback<StoreValue['payNow']>((amount, mode, term) => {
    const p: Payment = {
      id: `P-${++appSeq}`,
      studentId: user?.studentId ?? 'GUEST',
      receipt: `RCPT-2609-${300 + (appSeq % 600)}`,
      amount,
      mode,
      status: 'Paid',
      date: new Date().toISOString().slice(0, 10),
      term,
    }
    setPayments((list) => [p, ...list])
    toast('success', 'Payment successful (demo)', `${'₹'}${amount.toLocaleString('en-IN')} paid via ${mode}. Receipt ${p.receipt} generated.`)
    return p
  }, [toast, user])

  /* ------------------------------- notices ---------------------------- */
  const addNotice = useCallback<StoreValue['addNotice']>((n) => {
    const notice: Notice = { ...n, id: `N-${++appSeq}` }
    setNotices((list) => [notice, ...list])
    toast('success', 'Notice published', `“${n.title}” is now visible to residents.`)
  }, [toast])

  const removeNotice = useCallback((id: string) => {
    setNotices((list) => list.filter((n) => n.id !== id))
    toast('info', 'Notice removed', 'The notice has been taken down.')
  }, [toast])

  /* ------------------------------- students --------------------------- */
  const addStudent = useCallback<StoreValue['addStudent']>((input) => {
    const newStudent: Student = {
      ...input,
      id: `S-${1010 + students.length}`,
      avatar: input.name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST',
      attendancePct: 95,
    }
    setStudents((list) => [newStudent, ...list])
    toast('success', 'Student enrolled', `${newStudent.name} (${newStudent.rollNo}) added to resident roster.`)
    return newStudent
  }, [students.length, toast])

  const removeStudent = useCallback<StoreValue['removeStudent']>((id) => {
    setStudents((list) => list.filter((s) => s.id !== id))
    toast('info', 'Student removed', `Student record ${id} removed from roster.`)
  }, [toast])

  const resetDemoData = useCallback(() => {
    setShortlist([])
    setCompare([])
    setComplaints(SEED_COMPLAINTS)
    setPayments(SEED_PAYMENTS)
    setNotices(SEED_NOTICES)
    setStudents(STUDENTS)
    setApplications([])
    toast('info', 'Demo data reset', 'Shortlist, complaints, payments, notices and students restored to seeded state.')
  }, [toast])

  const value = useMemo<StoreValue>(() => ({
    user, login, loginAs, logout,
    theme, toggleTheme,
    shortlist, toggleShortlist, isShortlisted: (id) => shortlist.includes(id),
    compare, toggleCompare, clearCompare,
    applications, applyForRoom, decideApplication,
    complaints, submitComplaint, setComplaintStatus,
    payments, payNow,
    notices, addNotice, removeNotice,
    students, addStudent, removeStudent,
    toasts, toast, dismissToast,
    confirm, confirmState, resolveConfirm,
    resetDemoData,
  }), [
    user, login, loginAs, logout, theme, toggleTheme, shortlist, toggleShortlist, compare, toggleCompare, clearCompare,
    applications, applyForRoom, decideApplication, complaints, submitComplaint, setComplaintStatus,
    payments, payNow, notices, addNotice, removeNotice, students, addStudent, removeStudent, toasts, toast, dismissToast,
    confirm, confirmState, resolveConfirm, resetDemoData,
  ])

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <ConfirmHost />
    </StoreCtx.Provider>
  )
}

/* =========================================================================
   Role-based privacy gate
   Public visitors only ever see bed STATUS. Names, roll numbers, courses,
   academic year, phone and guardian details require an authorised role.
   ========================================================================= */
export function canViewPrivateDetails(user: AuthUser | null, targetStudentId?: string) {
  if (!user || !targetStudentId) return false
  if (user.role === 'admin' || user.role === 'warden') return true
  if (user.role === 'student' && user.studentId === targetStudentId) return true
  return false
}

/** Roommates are disclosed to a verified resident of the same room (limited
    fields only) and to wardens/admins in full. */
export function canViewRoommates(user: AuthUser | null, roomId: string) {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'warden') return true
  if (user.role === 'student') {
    const me = STUDENTS.find((s) => s.id === user.studentId)
    return me?.roomId === roomId
  }
  return false
}

export function protectedStudent(bedStudentId: string | undefined) {
  return STUDENTS.find((s) => s.id === bedStudentId)
}

/** Aggregated, privacy-safe room information for leaderboards and dashboards. */
export function roomHealth() {
  return {
    withSpace: STUDENTS.filter((s: Student) => s.roomId).length,
    roomsWithBeds: (room: Room) => bedCounts(room).available > 0 && roomStatus(room) !== 'maintenance',
  }
}

/* ---------------------------------------------------------------------- */
function ConfirmHost() {
  const ctx = useContext(StoreCtx)
  const req = ctx?.confirmState
  const dangerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!req) return
    dangerRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ctx?.resolveConfirm(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req, ctx])

  if (!req) return null
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="roh-confirm-title" onClick={(e) => { if (e.target === e.currentTarget) ctx?.resolveConfirm(false) }}>
      <div className="modal sm" style={{ animation: 'popIn 0.26s var(--ease) both' }}>
        <div className="modal-head">
          <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: req.danger ? 'rgba(251,113,133,0.16)' : 'rgba(139,92,246,0.18)', color: req.danger ? 'var(--danger)' : 'var(--violet-2)', flex: 'none' }}>
              <Icon name={req.danger ? 'alert' : 'info'} size={22} />
            </div>
            <div>
              <h3 id="roh-confirm-title" style={{ marginBottom: 6 }}>{req.title}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{req.message}</p>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => ctx?.resolveConfirm(false)}>
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={dangerRef}
            className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => ctx?.resolveConfirm(true)}
          >
            {req.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export type { Role }
