import React, { useEffect, useState } from 'react'
import { DEMO_ACCOUNTS, Role, roleLabel } from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { useRouter } from '../lib/router'
import { Button, Field, PrivacyNote, SectionHead, Tabs } from '../lib/ui'
import { useApp } from '../lib/store'
import { dashboardPath } from '../components/Nav'

const ROLE_META: Record<Exclude<Role, 'guest'>, { icon: IconName; color: string; perms: string[]; scope: string }> = {
  student: {
    icon: 'user', color: 'var(--cyan)', scope: 'Rooms, complaints, payments, mess, attendance and transport',
    perms: ['Explore and shortlist rooms', 'Apply for a room and track approval', 'Submit and reopen complaints', 'View fee ledger and receipts', 'See own bed, room and permitted roommates'],
  },
  warden: {
    icon: 'shield', color: 'var(--violet-2)', scope: 'Room occupancy, allocation, attendance, complaints and notices',
    perms: ['Monitor block occupancy floor by floor', 'Approve or waitlist room applications', 'Track attendance and night check-ins', 'Action complaints with assignment notes', 'Publish notices to residents'],
  },
  admin: {
    icon: 'activity', color: 'var(--blue-2)', scope: 'Full estate control across hostels, rooms, beds, fees and staff',
    perms: ['Manage hostels, buildings, floors, rooms and beds', 'Access every student record and allocation', 'Review fee collection and pending dues', 'Oversee mess, transport and complaints', 'Publish or withdraw any notice'],
  },
  mess: {
    icon: 'utensils', color: 'var(--pink)', scope: 'Mess menu and feedback management only',
    perms: ['Publish daily and weekly menus', 'Update meal timings and specials', 'Read and respond to meal feedback', 'Mark holiday menus'],
  },
  transport: {
    icon: 'bus', color: 'var(--ok)', scope: 'Transport routes and schedules only',
    perms: ['Create and edit bus routes', 'Update pickup points and timings', 'Mark delays or cancellations', 'Monitor seat availability'],
  },
}

export function Login() {
  const { login, loginAs, logout, user, toast } = useApp()
  const { navigate, query } = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signup, setSignup] = useState({ name: '', phone: '', role: 'student' as Role, password: '', confirm: '' })
  const [signupError, setSignupError] = useState('')

  useEffect(() => {
    if (query.get('demo')) {
      toast('info', 'Demo mode', 'Pick any role below — no password required. Each role unlocks a different dashboard.')
    }
  }, [query, toast])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    window.setTimeout(() => {
      const targetPhone = phone.trim() || '+91 98765 43210'
      const targetPass = password || 'demo1234'
      const res = login(targetPhone, targetPass)
      setBusy(false)
      if (!res.ok) { setError(res.error ?? 'Unable to sign in.'); return }
      const account = DEMO_ACCOUNTS[0]
      navigate(dashboardPath(account?.role))
    }, 520)
  }

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (signup.name.trim().length < 3) { setSignupError('Enter your full name (at least 3 characters).'); return }
    if (!/^\+?[0-9\s\-]{10,15}$/.test(signup.phone.trim())) { setSignupError('Enter a valid 10-digit phone number.'); return }
    if (signup.password.length < 6) { setSignupError('Choose a password of at least 6 characters.'); return }
    if (signup.password !== signup.confirm) { setSignupError('Passwords do not match.'); return }
    setSignupError('')
    const initials = signup.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    loginAs(DEMO_ACCOUNTS.find((a) => a.role === signup.role)?.email ?? 'student@roh.demo')
    toast('success', 'Account created (demo)', `${signup.name}, your ${roleLabel[signup.role]} profile is ready. Role dashboards are simulated locally.`)
    navigate(dashboardPath(signup.role))
    void initials
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Access & roles"
        title={user ? `Signed in as ${user.name}` : 'Sign in to your hostel account'}
        sub="ROH is role-aware: students, wardens, administrators, mess staff and transport managers each get a workspace scoped to what they actually need. Every demo account below works without a password."
      />

      {user && (
        <div className="glass glowing" style={{ padding: 22, marginBottom: 24 }}>
          <div className="row-between" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="profile-head">
              <span className="profile-av">{user.initials}</span>
              <div>
                <b style={{ fontSize: '1.1rem' }}>{user.name}</b>
                <div className="small muted">{user.title}</div>
                <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="chip-tag cyan">{roleLabel[user.role]}</span>
                  <span className="chip-tag">{user.email}</span>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <Button variant="primary" icon="activity" onClick={() => navigate(dashboardPath(user.role))}>Open dashboard</Button>
              <Button variant="ghost" icon="logout" onClick={logout}>Sign out</Button>
            </div>
          </div>
        </div>
      )}

      <div className="split">
        {/* Auth form */}
        <div className="card pad-lg">
          <Tabs
            ariaLabel="Authentication mode"
            tabs={[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Create account' }]}
            value={mode}
            onChange={setMode}
          />

          <div style={{ marginTop: 20 }}>
            {mode === 'signin' ? (
              <form className="col" style={{ gap: 15 }} onSubmit={submit}>
                <Field label="Phone number" id="login-phone">
                  <input
                    id="login-phone" className="input" type="tel" autoComplete="tel"
                    value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                  />
                </Field>
                <Field label="Password" id="login-password" hint="Demo mode accepts any password of 3+ characters.">
                  <input
                    id="login-password" className="input" type="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  />
                </Field>

                {error && (
                  <div className="error-box" role="alert">
                    <Icon name="alert" size={18} />
                    <span className="small">{error}</span>
                  </div>
                )}

                <Button variant="primary" type="submit" icon="key" block disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>

                <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
                  <span className="tiny dim">Quick demo:</span>
                  {DEMO_ACCOUNTS.slice(0, 3).map((a) => (
                    <button
                      key={a.email} type="button" className="chip-tag cyan"
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => { loginAs(a.email); navigate(dashboardPath(a.role)) }}
                    >
                      {roleLabel[a.role]}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <form className="col" style={{ gap: 15 }} onSubmit={submitSignup}>
                <Field label="Full name" id="su-name">
                  <input id="su-name" className="input" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} placeholder="Aarav Sharma" />
                </Field>
                <Field label="Phone number" id="su-phone">
                  <input id="su-phone" className="input" type="tel" value={signup.phone} onChange={(e) => setSignup({ ...signup, phone: e.target.value })} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Requested role" id="su-role" hint="Admin approves staff roles in production; demo grants instantly.">
                  <select id="su-role" className="select" value={signup.role} onChange={(e) => setSignup({ ...signup, role: e.target.value as Role })}>
                    {(['student', 'warden', 'admin', 'mess', 'transport'] as Role[]).map((r) => (
                      <option key={r} value={r}>{roleLabel[r]}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid g2" style={{ gap: 14 }}>
                  <Field label="Password" id="su-pass">
                    <input id="su-pass" className="input" type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
                  </Field>
                  <Field label="Confirm password" id="su-confirm">
                    <input id="su-confirm" className="input" type="password" value={signup.confirm} onChange={(e) => setSignup({ ...signup, confirm: e.target.value })} />
                  </Field>
                </div>

                {signupError && (
                  <div className="error-box" role="alert">
                    <Icon name="alert" size={18} />
                    <span className="small">{signupError}</span>
                  </div>
                )}

                <Button variant="primary" type="submit" icon="plus" block>Create demo account</Button>
                <p className="tiny dim" style={{ margin: 0 }}>
                  Accounts are simulated in-browser. No data leaves your device, and no email is sent.
                </p>
              </form>
            )}
          </div>

          <div className="divider" />
          <PrivacyNote compact />
        </div>

        {/* Demo accounts */}
        <div className="col" style={{ gap: 14 }}>
          <div className="row-between">
            <b className="row" style={{ gap: 8 }}><Icon name="sparkle" size={16} /> One-tap demo accounts</b>
            <span className="chip-tag violet">no password needed</span>
          </div>

          {DEMO_ACCOUNTS.map((a) => {
            const meta = ROLE_META[a.role as Exclude<Role, 'guest'>]
            const active = user?.email === a.email
            return (
              <button
                key={a.email}
                className={`card hoverable role-card ${active ? 'on' : ''}`}
                onClick={() => { loginAs(a.email); navigate(dashboardPath(a.role)) }}
                aria-label={`Sign in as ${roleLabel[a.role]}: ${a.name}`}
              >
                <div className="row-between" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(147,168,255,0.1)', border: '1px solid var(--stroke)', color: meta.color, flex: 'none' }}>
                      <Icon name={meta.icon} size={20} />
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <b>{roleLabel[a.role]}</b>
                        {active && <span className="badge available"><i className="dot" />Active</span>}
                      </div>
                      <div className="small muted">{a.name}</div>
                      <div className="mono tiny dim">{a.email}</div>
                    </div>
                  </div>
                  <Icon name="chevronRight" size={18} />
                </div>

                <div className="divider" />
                <div className="tiny muted" style={{ textAlign: 'left', marginBottom: 8 }}>{meta.scope}</div>
                <ul className="perm-list">
                  {meta.perms.slice(0, 3).map((p) => (
                    <li key={p}><Icon name="check" size={13} /> <span style={{ textAlign: 'left' }}>{p}</span></li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
