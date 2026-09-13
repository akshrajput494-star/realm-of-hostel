import React, { useEffect, useState } from 'react'
import { Icon, IconName, BrandMark } from '../lib/icons'
import { Link, useRouter } from '../lib/router'
import { roleLabel } from '../data/mock'
import { useApp } from '../lib/store'

export interface NavItem { to: string; label: string; short: string; icon: IconName; match: string[] }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', short: 'Home', icon: 'home', match: ['/'] },
  { to: '/rooms', label: 'Explore Rooms', short: 'Rooms', icon: 'bed', match: ['/rooms', '/room'] },
  { to: '/map', label: '3D Hostel Map', short: '3D Map', icon: 'layers', match: ['/map'] },
  { to: '/mess', label: 'Mess & Menu', short: 'Mess', icon: 'utensils', match: ['/mess'] },
  { to: '/transport', label: 'Transport', short: 'Transport', icon: 'bus', match: ['/transport'] },
  { to: '/complaints', label: 'Complaints', short: 'Complaints', icon: 'clipboard', match: ['/complaints'] },
  { to: '/payments', label: 'Payments', short: 'Payments', icon: 'wallet', match: ['/payments'] },
  { to: '/notices', label: 'Notices', short: 'Notices', icon: 'bell', match: ['/notices'] },
]

export const dashboardPath = (role?: string) => (role === 'admin' ? '/admin' : '/dashboard')

const isActive = (path: string, item: NavItem) => item.match.some((m) => (m === '/' ? path === '/' : path === m || path.startsWith(`${m}/`)))

export function Nav() {
  const { path } = useRouter()
  const { user, theme, toggleTheme, logout, confirm } = useApp()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { setOpen(false) }, [path])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const dash = dashboardPath(user?.role)

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out of ROH?',
      message: 'You will return to visitor mode. Bed status stays public, but student details will be hidden again.',
      confirmLabel: 'Sign out',
      danger: true,
    })
    if (ok) logout()
  }

  return (
    <>
      <header className="nav" style={scrolled ? { boxShadow: '0 10px 40px -20px rgba(0,0,0,0.9)' } : undefined}>
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Realm of Hostel home">
            <BrandMark />
            <span>
              <span className="brand-name">Realm of Hostel</span>
              <span className="brand-sub">ROH · Campus Living</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${isActive(path, item) ? 'active' : ''}`}
                aria-current={isActive(path, item) ? 'page' : undefined}
                title={item.label}
              >
                {item.short}
              </Link>
            ))}
          </nav>

          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ minWidth: 36, height: 36, padding: 0 }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>
            {user ? (
              <>
                <Link to={dash} className={`btn btn-ghost btn-sm ${path === dash ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                  <Icon name={user.role === 'admin' ? 'shield' : 'activity'} size={16} />
                  <span className="hide-sm">Dashboard</span>
                </Link>
                <button className="avatar" onClick={handleLogout} title={`${user.name} · ${roleLabel[user.role]} — click to sign out`} aria-label="Account menu: sign out">
                  {user.initials}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                  Login
                </Link>
                <Link to="/login?demo=1" className="btn btn-primary btn-sm hide-sm" style={{ textDecoration: 'none' }}>
                  <Icon name="sparkle" size={15} /> Try Demo
                </Link>
              </>
            )}
            <button className="nav-toggle" onClick={() => setOpen(true)} aria-label="Open navigation menu" aria-expanded={open}>
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`drawer ${open ? 'open' : ''}`} aria-label="Mobile navigation" aria-hidden={!open}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <b className="small">Menu</b>
          <button className="modal-x" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" size={17} /></button>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className={`drawer-link ${isActive(path, item) ? 'active' : ''}`}>
            <Icon name={item.icon} size={18} /> {item.label}
          </Link>
        ))}
        <div className="divider" />
        <Link to={dash} className={`drawer-link ${path === dash ? 'active' : ''}`}>
          <Icon name="activity" size={18} /> {user ? `${roleLabel[user.role]} Dashboard` : 'Student Dashboard'}
        </Link>
        <Link to="/login" className="drawer-link"><Icon name="key" size={18} /> Login & Roles</Link>
        {user ? (
          <button className="drawer-link" onClick={handleLogout} style={{ width: '100%' }}>
            <Icon name="logout" size={18} /> Sign out ({roleLabel[user.role]})
          </button>
        ) : (
          <Link to="/login?demo=1" className="btn btn-primary btn-block" style={{ marginTop: 10 }}>
            <Icon name="sparkle" size={16} /> Demo Login
          </Link>
        )}
      </aside>

      {/* Mobile bottom navigation — thumb-friendly primary destinations */}
      <nav className="bottom-nav" aria-label="Quick navigation">
        {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[3]].map((item) => (
          <Link key={item.to} to={item.to} className={isActive(path, item) ? 'active' : ''}>
            <Icon name={item.icon} size={19} /> {item.short}
          </Link>
        ))}
        <Link to={dash} className={path === dash ? 'active' : ''}>
          <Icon name="activity" size={19} /> {user ? 'Dash' : 'Login'}
        </Link>
      </nav>
    </>
  )
}

export function Footer() {
  const { resetDemoData, confirm } = useApp()
  const year = new Date().getFullYear()

  const onReset = async () => {
    const ok = await confirm({
      title: 'Reset demo data?',
      message: 'Your shortlist, submitted complaints, demo payments and published notices will be restored to the seeded hackathon dataset. This cannot be undone.',
      confirmLabel: 'Reset data',
      danger: true,
    })
    if (ok) resetDemoData()
  }

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="grid g4" style={{ gap: 28 }}>
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <BrandMark size={34} />
              <span>
                <span className="brand-name">Realm of Hostel</span>
                <span className="brand-sub">ROH</span>
              </span>
            </div>
            <p className="small muted" style={{ maxWidth: '34ch' }}>
              “Your hostel. Your room. Your complete campus life.” Smart hostel discovery and
              campus-life management for students, wardens and administrators.
            </p>
            <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="chip-tag cyan">React + TypeScript</span>
              <span className="chip-tag violet">Demo build v1.0</span>
            </div>
          </div>

          <div>
            <h4>Explore</h4>
            <div className="footer-links">
              <Link to="/rooms">Explore Rooms</Link>
              <Link to="/map">3D Hostel Map</Link>
              <Link to="/mess">Mess & Weekly Menu</Link>
              <Link to="/transport">Transport Schedule</Link>
              <Link to="/notices">Hostel Notices</Link>
            </div>
          </div>

          <div>
            <h4>Services</h4>
            <div className="footer-links">
              <Link to="/complaints">Raise a Complaint</Link>
              <Link to="/payments">Fees & Payments</Link>
              <Link to="/dashboard">Student Dashboard</Link>
              <Link to="/admin">Admin Console</Link>
              <Link to="/login">Login & Roles</Link>
            </div>
          </div>

          <div>
            <h4>Contact & Legal</h4>
            <div className="footer-links">
              <a href="mailto:helpdesk@roh.edu">helpdesk@roh.edu</a>
              <a href="tel:+919811022110">+91 98110 22110</a>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Use</Link>
              <button onClick={onReset}>Reset demo data</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} Realm of Hostel (ROH) · Built for the campus hackathon. Demo data only — no real payments are processed.</span>
          <span className="row" style={{ gap: 14 }}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <span>Greater Noida, India</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
