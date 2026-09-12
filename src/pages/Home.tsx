import React, { useEffect, useRef, useState } from 'react'
import { Icon, IconName } from '../lib/icons'
import { Link } from '../lib/router'
import { Button, LinkButton, PrivacyNote, SectionHead, StatCard, Tag } from '../lib/ui'
import { IsoBuilding } from '../components/IsoScene'
import { ROOMS, bedCounts, hostelStats, roomStatus, rupee, todayLong } from '../data/mock'
import { Spark } from '../lib/charts'
import { useApp } from '../lib/store'

/* Count-up animation for the hero statistics. */
function useCountUp(target: number, duration = 1500, start = true) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      // easeOutExpo for a premium settle
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setValue(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration, start])
  return value
}

function Stat({ label, value, suffix, foot, tone, icon, spark }: {
  label: string; value: number; suffix?: string; foot?: React.ReactNode
  tone?: 'default' | 'ok' | 'warn' | 'info'; icon: IconName; spark?: React.ReactNode
}) {
  const n = useCountUp(value)
  return (
    <StatCard
      label={label}
      value={<>{n.toLocaleString('en-IN')}<span style={{ fontSize: '0.6em', color: 'var(--muted)' }}>{suffix}</span></>}
      icon={icon}
      tone={tone}
      spark={spark}
      foot={foot}
    />
  )
}

const FEATURES: { icon: IconName; title: string; body: string; to: string; tone: 'violet' | 'cyan' | 'blue' }[] = [
  { icon: 'bed', title: 'Smart Room Explorer', body: 'Search 36 rooms across 3 blocks by AC type, capacity, floor, fee band and facilities — with instant filters and sorting.', to: '/rooms', tone: 'violet' },
  { icon: 'users', title: 'Bed Availability', body: 'See live availability down to the individual bed, including reserved and under-maintenance beds, with privacy-safe occupancy.', to: '/map', tone: 'cyan' },
  { icon: 'utensils', title: 'Mess Information', body: "Today's menu, the full weekly rotation, meal timings, holiday specials and a rating channel straight to the mess committee.", to: '/mess', tone: 'blue' },
  { icon: 'clipboard', title: 'Complaint Tracking', body: 'Raise a ticket with category, priority and photo proof — then follow it through assignment, progress and resolution.', to: '/complaints', tone: 'violet' },
  { icon: 'wallet', title: 'Hostel Payments', body: 'Total fee, paid and pending amounts, due dates and downloadable receipt status — all in one ledger view.', to: '/payments', tone: 'cyan' },
  { icon: 'bus', title: 'College Transport', body: 'Bus routes, pickup points, departure and arrival times, seat availability and the next bus out of your gate.', to: '/transport', tone: 'blue' },
]

const STEPS = [
  { n: '01', title: 'Create your profile', body: 'Sign in with your college email. ROH maps you to your hostel, building, room and bed instantly.' },
  { n: '02', title: 'Discover & compare rooms', body: 'Filter by AC/Non-AC, 3 or 4-seater, floor, fee band and facilities. Shortlist and compare up to three rooms side by side.' },
  { n: '03', title: 'Apply and get allotted', body: 'Submit an application with an optional note to the warden. Track approval status from your dashboard.' },
  { n: '04', title: 'Live your campus life', body: 'Mess menus, bus timings, fee ledger, complaints and notices — everything in one futuristic control room.' },
]

export function Home() {
  const stats = hostelStats()
  const { notices, user } = useApp()
  const [tab, setTab] = useState<'all' | 'ac' | 'nonac'>('all')

  const filtered = ROOMS.filter((r) => (tab === 'all' ? true : tab === 'ac' ? r.type === 'AC' : r.type === 'Non-AC'))
  const topOpen = filtered
    .filter((r) => bedCounts(r).available > 0 && roomStatus(r) !== 'maintenance')
    .sort((a, b) => bedCounts(b).available - bedCounts(a).available || a.monthlyFee - b.monthlyFee)
    .slice(0, 3)

  return (
    <div className="page-enter">
      {/* ------------------------------- HERO ------------------------------ */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="anim-up">
            <span className="hero-badge">
              <Icon name="sparkle" size={15} />
              Smart hostel discovery for modern campuses
            </span>
            <h1>Find your <span className="grad-text">perfect hostel room.</span></h1>
            <p className="lead">
              The smart hostel discovery and information-management platform for students, wardens and hostel
              administrators. Explore rooms, check AC and Non-AC bed availability, compare 3-seater and 4-seater
              options, review fees and facilities — then run your mess menu, complaints, payments, transport and
              notices from one futuristic dashboard.
            </p>
            <div className="hero-cta">
              <LinkButton to="/rooms" variant="primary" size="lg" icon="bed" iconRight="arrowRight">Explore Rooms</LinkButton>
              <LinkButton to={user?.role === 'admin' ? '/admin' : '/dashboard'} variant="ghost" size="lg" icon="activity">
                View Dashboard
              </LinkButton>
            </div>
            <div className="trust-row">
              <span><Icon name="shield" size={15} /> Privacy-first: bed status is public, student details are not</span>
              <span><Icon name="zap" size={15} /> Live demo data · no signup needed</span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              {!user && (
                <>
                  <span className="chip-tag violet">Try a demo role →</span>
                  <Link to="/login?demo=1" className="chip-tag cyan" style={{ cursor: 'pointer' }}>student@roh.demo</Link>
                  <Link to="/login?demo=1" className="chip-tag">warden@roh.demo</Link>
                  <Link to="/login?demo=1" className="chip-tag">admin@roh.demo</Link>
                </>
              )}
              {user && <span className="chip-tag cyan">Signed in as {user.name} · {user.title}</span>}
            </div>
          </div>

          <div className="anim-in" style={{ animationDelay: '0.15s' }}>
            <IsoBuilding floors={4} beds={stats.totalBeds} occupancy={stats.occupancyPct} blocks={stats.totalBuildings} />
          </div>
        </div>
      </section>

      {/* ------------------------------ STATS ------------------------------ */}
      <section className="section-sm">
        <div className="wrap">
          <div className="grid g4 stagger">
            <Stat label="Total Rooms" value={stats.totalRooms} icon="building" foot="Across 3 blocks in 2 hostels" />
            <Stat
              label="Available Beds" value={stats.available} tone="ok" icon="bed"
              foot={<><b className="delta up">{stats.reserved}</b> reserved · {stats.maintenanceBeds} in maintenance</>}
            />
            <Stat
              label="Occupancy Rate" value={stats.occupancyPct} suffix="%" tone="info" icon="trending"
              spark={<Spark values={[52, 58, 63, 69, 72, 75, stats.occupancyPct]} />}
            />
            <Stat label="Registered Students" value={stats.registeredStudents} icon="users" foot="Wardens, mess and transport staff included" />
          </div>
        </div>
      </section>

      {/* --------------------------- LIVE SNAPSHOT ------------------------- */}
      <section className="section-sm">
        <div className="wrap">
          <div className="glass pad-lg" style={{ padding: 24 }}>
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="kicker-num">Live availability snapshot · {todayLong()}</div>
                <h3 style={{ marginTop: 8, marginBottom: 0 }}>Ready-to-move rooms right now</h3>
              </div>
              <div className="day-tabs" role="tablist" aria-label="Filter snapshot by room type">
                <button role="tab" aria-selected={tab === 'all'} className={`chip ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>All rooms</button>
                <button role="tab" aria-selected={tab === 'ac'} className={`chip ${tab === 'ac' ? 'on' : ''}`} onClick={() => setTab('ac')}>❄ AC</button>
                <button role="tab" aria-selected={tab === 'nonac'} className={`chip ${tab === 'nonac' ? 'on' : ''}`} onClick={() => setTab('nonac')}>Non-AC</button>
              </div>
            </div>

            <div className="grid g3" style={{ marginTop: 20 }}>
              {topOpen.map((room) => {
                const c = bedCounts(room)
                return (
                  <Link key={room.id} to={`/rooms/${room.id}`} className="card hoverable tight" style={{ color: 'inherit' }}>
                    <div className="row-between">
                      <b>{room.number}</b>
                      <Tag tone={room.type === 'AC' ? 'cyan' : 'violet'}>{room.type}</Tag>
                    </div>
                    <div className="row" style={{ gap: 14, marginTop: 10, fontSize: '0.82rem' }}>
                      <span><b style={{ color: 'var(--ok)' }}>{c.available}</b> free</span>
                      <span className="muted">{room.seater}-seater</span>
                      <span className="spacer" />
                      <b>{rupee(room.monthlyFee)}<span className="tiny muted">/mo</span></b>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
              <LinkButton to="/rooms" variant="primary" icon="search">Browse all {stats.totalRooms} rooms</LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------- FEATURES ---------------------------- */}
      <section className="section">
        <div className="wrap">
          <SectionHead
            eyebrow="Everything in one place"
            title="One platform for the entire hostel lifecycle"
            sub="ROH replaces notice boards, WhatsApp groups and paper registers with a single source of truth — for residents and for the staff who run the hostel."
          />
          <div className="grid g3 stagger">
            {FEATURES.map((f) => (
              <Link key={f.title} to={f.to} className="card hoverable feature" style={{ color: 'inherit' }}>
                <div className="feature-ico"><Icon name={f.icon} size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <span className="row small" style={{ marginTop: 14, color: 'var(--cyan)', fontWeight: 650 }}>
                  Open module <Icon name="arrowRight" size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- HOW ROH WORKS ------------------------- */}
      <section className="section" id="how-it-works">
        <div className="wrap">
          <SectionHead
            eyebrow="How ROH works"
            title="From discovery to daily campus life in four steps"
            sub="A guided flow that works the same whether you are a first-year looking for a bed or a warden allocating an entire floor."
          />
          <div className="grid g2" style={{ gap: 30 }}>
            <div className="col" style={{ gap: 26 }}>
              {STEPS.map((s, i) => (
                <div className="step" key={s.n}>
                  <span className="step-n">{s.n}</span>
                  {i < STEPS.length - 1 && <span className="step-line" />}
                  <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                  <p className="small" style={{ margin: 0 }}>{s.body}</p>
                </div>
              ))}
            </div>

            <div className="col" style={{ gap: 16 }}>
              <div className="card" style={{ padding: 22 }}>
                <div className="card-title" style={{ marginBottom: 14 }}><Icon name="bell" size={17} /> Latest notices</div>
                <div className="col" style={{ gap: 12 }}>
                  {notices.slice(0, 3).map((n) => (
                    <Link key={n.id} to="/notices" className="row" style={{ gap: 12, color: 'inherit', alignItems: 'flex-start' }}>
                      <span className="pin">{n.category[0]}</span>
                      <span>
                        <b className="small" style={{ display: 'block' }}>{n.title}</b>
                        <span className="tiny muted">{n.date} · {n.by}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 16 }}>
                  <LinkButton to="/notices" variant="ghost" size="sm" iconRight="arrowRight">All notices</LinkButton>
                </div>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div className="card-title" style={{ marginBottom: 14 }}><Icon name="zap" size={17} /> Module coverage</div>
                <div className="grid g2" style={{ gap: 12 }}>
                  {[
                    ['Rooms & beds', `${stats.totalBeds} beds`],
                    ['Buildings & floors', `${stats.totalBuildings} blocks · ${stats.totalFloors} floors`],
                    ['Complaint desk', `${stats.pendingComplaints} open tickets`],
                    ['Transport', '5 routes running'],
                  ].map(([k, v]) => (
                    <div className="spec" key={k} style={{ textAlign: 'left' }}>
                      <span>{k}</span>
                      <b style={{ marginTop: 2 }}>{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ PRIVACY ---------------------------- */}
      <section className="section-sm">
        <div className="wrap">
          <PrivacyNote />
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="section">
        <div className="wrap">
          <div className="glass glowing" style={{ padding: '38px 30px', textAlign: 'center' }}>
            <div className="kicker-num">Hackathon demo build</div>
            <h2 style={{ margin: '10px 0 12px' }}>Your hostel. Your room. Your complete campus life.</h2>
            <p className="lead" style={{ margin: '0 auto 22px' }}>
              Jump straight in with a demo role — no signup, no card, no backend required. Every action is
              simulated locally so you can explore the full product in minutes.
            </p>
            <div className="row" style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <LinkButton to="/login?demo=1" variant="primary" size="lg" icon="sparkle">Try Demo Login</LinkButton>
              <LinkButton to="/map" variant="ghost" size="lg" icon="layers">Open 3D Hostel Map</LinkButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
