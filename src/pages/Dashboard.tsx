import React, { useMemo, useState } from 'react'
import {
  COLLEGE_TIMING, EMERGENCY_CONTACTS, GYM_TIMING, MESS_TIMINGS, MESS_WEEK, ROOMS, STUDENTS, TRANSPORT_ROUTES,
  bedCounts, floorName, getBuilding, getHostel, getRoom, roleLabel, roomStatus, rupee, statusLabel,
  todayDayName, todayLong, todayShort, amountsFor,
} from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { Link } from '../lib/router'
import { BarChart, DonutChart, LineChart, ProgressRing, Spark, StackedBar } from '../lib/charts'
import { Button, EmptyState, Field, KV, LinkButton, Progress, SectionHead, StatCard, StatusBadge, Tabs } from '../lib/ui'
import { BedLayout, RoomDetail } from '../components/RoomDetail'
import { Room } from '../data/mock'
import { useApp } from '../lib/store'
import { dashboardPath } from '../components/Nav'

type Section = { id: string; label: string; icon: IconName }

const SECTIONS: Record<string, Section[]> = {
  student: [
    { id: 'overview', label: 'Overview', icon: 'activity' },
    { id: 'room', label: 'My Room & Bed', icon: 'bed' },
    { id: 'mess', label: 'Mess & Timings', icon: 'utensils' },
    { id: 'transport', label: 'Transport', icon: 'bus' },
    { id: 'complaints', label: 'My Complaints', icon: 'clipboard' },
    { id: 'payments', label: 'Fees & Payments', icon: 'wallet' },
    { id: 'contacts', label: 'Emergency Contacts', icon: 'phone' },
  ],
  warden: [
    { id: 'overview', label: 'Occupancy Overview', icon: 'activity' },
    { id: 'allocation', label: 'Room Applications', icon: 'users' },
    { id: 'attendance', label: 'Attendance', icon: 'calendar' },
    { id: 'complaints', label: 'Complaint Queue', icon: 'clipboard' },
    { id: 'notices', label: 'Notices', icon: 'bell' },
  ],
  mess: [
    { id: 'overview', label: 'Mess Overview', icon: 'activity' },
    { id: 'menu', label: 'Menu Manager', icon: 'utensils' },
    { id: 'feedback', label: 'Meal Feedback', icon: 'star' },
    { id: 'timings', label: 'Timings', icon: 'clock' },
  ],
  transport: [
    { id: 'overview', label: 'Fleet Overview', icon: 'activity' },
    { id: 'routes', label: 'Routes & Stops', icon: 'map' },
    { id: 'schedule', label: 'Schedule Board', icon: 'calendar' },
  ],
  admin: [],
  guest: [],
}

export function Dashboard() {
  const { user, complaints, payments, applications, notices, toast, confirm, decideApplication, setComplaintStatus } = useApp()
  const [section, setSection] = useState('overview')
  const [detail, setDetail] = useState<Room | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [checkState, setCheckState] = useState<{ in?: string; out?: string }>({})

  const role = user?.role ?? 'guest'
  const sections = SECTIONS[role] ?? []
  const me = STUDENTS.find((s) => s.id === user?.studentId)
  const myRoom = me ? getRoom(me.roomId) : undefined
  const myBed = myRoom?.beds.find((b) => b.id === me?.bedId)
  const roommates = myRoom ? STUDENTS.filter((s) => s.roomId === myRoom.id && s.id !== me?.id) : []

  const myComplaints = complaints.filter((c) => c.studentId === user?.studentId)
  const myPayments = payments.filter((p) => p.studentId === user?.studentId)
  const balance = me ? amountsFor(me, payments) : null
  const pendingFee = balance?.pending ?? 0

  const todayMenu = MESS_WEEK.find((d) => d.day === todayDayName()) ?? MESS_WEEK[0]
  const nextBus = [...TRANSPORT_ROUTES].sort((a, b) => a.nextAt.localeCompare(b.nextAt))[0]

  /* ------------------------------- guests -------------------------------- */
  if (!user) {
    return (
      <div className="page-enter wrap section">
        <SectionHead eyebrow="Dashboard" title="Sign in to open your dashboard" sub="Dashboards are role-scoped — a student sees their room, mess, fees and complaints; a warden sees allocations and the complaint queue; an admin sees the whole estate." />
        <EmptyState
          icon="lock"
          title="No active session"
          message="Use a one-tap demo account to explore any of the five role dashboards. No password required."
          action={<LinkButton to="/login?demo=1" variant="primary" icon="key">Open demo login</LinkButton>}
        />
        <div className="grid g3" style={{ marginTop: 22 }}>
          {[
            { t: 'Student', d: 'Room, bed, mess, transport, complaints, payments', to: '/login?demo=1', i: 'user' as IconName },
            { t: 'Warden', d: 'Occupancy, applications, attendance, complaints', to: '/login?demo=1', i: 'shield' as IconName },
            { t: 'Administrator', d: 'Full estate, fees, staff and staff-only records', to: '/login?demo=1', i: 'activity' as IconName },
          ].map((c) => (
            <Link key={c.t} to={c.to} className="card hoverable feature" style={{ color: 'inherit' }}>
              <div className="feature-ico"><Icon name={c.i} size={22} /></div>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  if (user.role === 'admin') {
    return (
      <div className="page-enter wrap section">
        <SectionHead eyebrow="Administrator" title="Administrator console" sub="The administrator workspace manages every hostel, room, bed, student, payment, complaint, mess and transport record." />
        <EmptyState
          icon="shield"
          title="Your console is the full admin dashboard"
          message="As an administrator you get estate-wide statistics, charts and the twelve management sections rather than a personal dashboard."
          action={<LinkButton to="/admin" variant="primary" icon="activity">Open Admin Dashboard</LinkButton>}
        />
      </div>
    )
  }

  const activeSection = sections.find((s) => s.id === section) ?? sections[0]

  return (
    <div className="wrap dash page-enter">
      {/* Sidebar */}
      <aside>
        <div className="side-nav">
          <div className="profile-head" style={{ padding: '6px 6px 14px' }}>
            <span className="profile-av" style={{ width: 48, height: 48, fontSize: '1rem', borderRadius: 16 }}>{user.initials}</span>
            <div>
              <b style={{ display: 'block', fontSize: '0.95rem' }}>{user.name}</b>
              <span className="tiny muted">{roleLabel[user.role]}</span>
            </div>
          </div>
          <div className="divider" style={{ margin: '0 0 10px' }} />
          {sections.map((s) => (
            <button key={s.id} className={`side-link ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)} aria-current={section === s.id ? 'true' : undefined}>
              <Icon name={s.icon} size={17} /> {s.label}
            </button>
          ))}
          <div className="divider" />
          <Link to={dashboardPath(user.role)} className="side-link"><Icon name="home" size={17} /> Back to top</Link>
          <Link to="/rooms" className="side-link"><Icon name="bed" size={17} /> Explore Rooms</Link>
          <Link to="/map" className="side-link"><Icon name="layers" size={17} /> 3D Hostel Map</Link>
        </div>
      </aside>

      {/* Content */}
      <div className="col" style={{ gap: 20 }}>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="kicker-num">{roleLabel[user.role]} workspace · {todayLong()}</div>
            <h2 style={{ margin: '8px 0 0' }}>{activeSection?.label}</h2>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="chip-tag cyan"><Icon name="shield" size={12} /> {user.title}</span>
            <span className="chip-tag">{roleLabel[user.role]} access</span>
          </div>
        </div>

        {/* ============================ STUDENT ============================ */}
        {role === 'student' && (
          <>
            {section === 'overview' && me && (
              <>
                <div className="grid g3">
                  <StatCard
                    compact
                    label="Bed allotted"
                    value={`${myRoom?.number ?? '—'} · Bed ${myBed?.label ?? '—'}`}
                    icon="bed"
                    foot={`${floorName(myRoom?.floor ?? 0)} · ${getBuilding(myRoom?.buildingId ?? '')?.name}`}
                  />
                  <StatCard label="Pending fees" value={rupee(pendingFee)} tone={pendingFee > 0 ? 'danger' : 'ok'} icon="wallet" foot={pendingFee > 0 ? 'Due 30 September 2026' : 'All dues cleared'} />
                  <StatCard label="Open complaints" value={myComplaints.filter((c) => c.status !== 'resolved').length} tone="info" icon="clipboard" foot={`${myComplaints.length} lifetime tickets`} />
                </div>

                <div className="grid g2">
                  {/* Profile */}
                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 16 }}><Icon name="user" size={17} /> Student profile</div>
                    <div className="profile-head" style={{ marginBottom: 16 }}>
                      <span className="profile-av">{me.avatar}</span>
                      <div>
                        <b style={{ fontSize: '1.15rem' }}>{me.name}</b>
                        <div className="small muted">{me.course} · {me.year}</div>
                        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <span className="chip-tag cyan">{me.rollNo}</span>
                          <span className="chip-tag">Hostel resident</span>
                        </div>
                      </div>
                    </div>
                    <KV rows={[
                      ['Email', me.email],
                      ['Phone', me.phone],
                      ['Hostel', getHostel(me.hostelId)?.name ?? '—'],
                      ['Building', getBuilding(me.buildingId)?.name ?? '—'],
                      ['Room', myRoom?.number ?? '—'],
                      ['Bed', `${myBed?.label ?? '—'} · ${myBed ? statusLabel[myBed.status] : '—'}`],
                      ['Guardian', `${me.guardian} · ${me.guardianPhone}`],
                    ]} />
                    <p className="tiny dim" style={{ marginTop: 12, marginBottom: 0 }}>
                      <Icon name="lock" size={12} style={{ verticalAlign: '-2px' }} /> This private record is visible only to you, your warden and the administrator.
                    </p>
                  </div>

                  {/* Check in / out + transport */}
                  <div className="col" style={{ gap: 20 }}>
                    <div className="card pad-lg">
                      <div className="card-title" style={{ marginBottom: 16 }}><Icon name="clock" size={17} /> Daily check-in / check-out</div>
                      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                        <ProgressRing pct={checkState.in && checkState.out ? 100 : checkState.in ? 50 : 0} label="Today" />
                        <div className="grow">
                          <div className="kv">
                            <div className="kv-row"><span>Check-in</span><span>{checkState.in ?? 'Not marked'}</span></div>
                            <div className="kv-row"><span>Check-out</span><span>{checkState.out ?? 'Not marked'}</span></div>
                            <div className="kv-row"><span>Curfew</span><span>23:00 (late entry log applies)</span></div>
                          </div>
                          <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                            <Button
                              size="sm" variant="primary" icon="check" disabled={!!checkState.in}
                              onClick={() => { setCheckState((s) => ({ ...s, in: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })); toast('success', 'Check-in recorded', 'Your entry is logged with the gate register.') }}
                            >
                              {checkState.in ? `Checked in ${checkState.in}` : 'Mark check-in'}
                            </Button>
                            <Button
                              size="sm" variant="ghost" icon="logout" disabled={!checkState.in || !!checkState.out}
                              onClick={() => { setCheckState((s) => ({ ...s, out: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })); toast('info', 'Check-out recorded', 'Have a good day — remember the 23:00 curfew.') }}
                            >
                              {checkState.out ? `Checked out ${checkState.out}` : 'Mark check-out'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-title" style={{ marginBottom: 14 }}><Icon name="bus" size={17} /> Next bus from your gate</div>
                      <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <b style={{ fontSize: '1.3rem' }}>{nextBus.nextAt}</b>
                          <div className="small muted">{nextBus.route}</div>
                          <div className="tiny dim">Bus {nextBus.busNo} · {nextBus.seats - nextBus.booked} seats free</div>
                        </div>
                        <LinkButton to="/transport" variant="ghost" size="sm" iconRight="arrowRight">Timetable</LinkButton>
                      </div>
                      <div className="divider" />
                      <div className="row-between small">
                        <span className="muted">College hours</span><b>{COLLEGE_TIMING.classes}</b>
                      </div>
                      <div className="row-between small" style={{ marginTop: 8 }}>
                        <span className="muted">Gym today</span><b>{GYM_TIMING.open} – {GYM_TIMING.close}</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today's menu */}
                <div className="card pad-lg">
                  <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}><Icon name="utensils" size={17} /> Today's mess menu · {todayDayName()}</div>
                    <LinkButton to="/mess" variant="ghost" size="sm" iconRight="arrowRight">Weekly menu</LinkButton>
                  </div>
                  <div className="grid g4">
                    {todayMenu.meals.map((m) => (
                      <div className="card tight" key={m.key}>
                        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                          <span className="meal-ico" style={{ width: 34, height: 34, fontSize: '1rem' }}>{m.icon}</span>
                          <div>
                            <b className="small">{m.name}</b>
                            <div className="tiny muted">{m.open} – {m.close}</div>
                          </div>
                        </div>
                        <ul className="menu-list">{m.items.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid g2">
                  {/* Fees */}
                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 16 }}><Icon name="wallet" size={17} /> Payment summary</div>
                    <Progress pct={((balance?.paid ?? 0) / me.feeTotal) * 100} tone="ok" label={`${rupee(balance?.paid ?? 0)} paid of ${rupee(me.feeTotal)}`} />
                    <div className="divider" />
                    <KV rows={[
                      ['Total hostel fee', rupee(me.feeTotal)],
                      ['Paid', <b style={{ color: 'var(--ok)' }}>{rupee(balance?.paid ?? 0)}</b>],
                      ['Pending', <b style={{ color: pendingFee ? 'var(--danger)' : 'var(--ok)' }}>{rupee(pendingFee)}</b>],
                      ['Due date', '30 Sept 2026'],
                      ['Receipts', `${myPayments.length} available`],
                    ]} />
                    <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                      <LinkButton to="/payments" variant="primary" size="sm" icon="wallet">Pay now</LinkButton>
                      <LinkButton to="/payments" variant="ghost" size="sm" icon="clipboard">Ledger</LinkButton>
                    </div>
                  </div>

                  {/* Complaints */}
                  <div className="card pad-lg">
                    <div className="row-between" style={{ marginBottom: 16 }}>
                      <div className="card-title" style={{ marginBottom: 0 }}><Icon name="clipboard" size={17} /> Complaint status</div>
                      <LinkButton to="/complaints" variant="ghost" size="sm">Raise a ticket</LinkButton>
                    </div>
                    {myComplaints.length === 0 ? (
                      <span className="small muted">No complaints raised. Your room is running smoothly.</span>
                    ) : (
                      <div className="col" style={{ gap: 12 }}>
                        {myComplaints.slice(0, 3).map((c) => (
                          <div className="card tight" key={c.id}>
                            <div className="row-between" style={{ gap: 10, flexWrap: 'wrap' }}>
                              <b className="small">{c.title}</b>
                              <StatusBadge status={c.status} />
                            </div>
                            <div className="tiny muted" style={{ marginTop: 5 }}>
                              {c.ticket} · {c.category} · {new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </div>
                          </div>
                        ))}
                        <LinkButton to="/complaints" variant="ghost" size="sm" iconRight="arrowRight">Track all {myComplaints.length} tickets</LinkButton>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roommates + notices */}
                <div className="grid g2">
                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 14 }}><Icon name="users" size={17} /> Permitted roommate information</div>
                    {roommates.length ? (
                      <div className="col" style={{ gap: 12 }}>
                        {roommates.map((r) => (
                          <div className="row" key={r.id} style={{ gap: 12 }}>
                            <span className="avatar">{r.avatar}</span>
                            <div>
                              <b className="small">{r.name}</b>
                              <div className="tiny muted">{r.course} · {r.year}</div>
                            </div>
                            <span className="spacer" />
                            <span className="chip-tag">Bed {myRoom?.beds.find((b) => b.studentId === r.id)?.label}</span>
                          </div>
                        ))}
                        <span className="tiny dim">Roommates of your own room are shown in full. Other residents' records stay private.</span>
                      </div>
                    ) : <span className="small muted">You currently have the room to yourself.</span>}
                  </div>

                  <div className="card pad-lg">
                    <div className="row-between" style={{ marginBottom: 14 }}>
                      <div className="card-title" style={{ marginBottom: 0 }}><Icon name="bell" size={17} /> Hostel notices</div>
                      <LinkButton to="/notices" variant="ghost" size="sm">View all</LinkButton>
                    </div>
                    <div className="col" style={{ gap: 12 }}>
                      {notices.slice(0, 4).map((n) => (
                        <Link key={n.id} to="/notices" className="row" style={{ gap: 11, color: 'inherit', alignItems: 'flex-start' }}>
                          <span className="pin">{n.category[0]}</span>
                          <span>
                            <b className="small" style={{ display: 'block' }}>{n.title}</b>
                            <span className="tiny muted">{n.date} · {n.by}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'room' && me && myRoom && (
              <>
                <div className="grid g4">
                  <StatCard label="Room" value={myRoom.number} icon="bed" foot={`${getBuilding(myRoom.buildingId)?.name} · ${floorName(myRoom.floor)}`} />
                  <StatCard label="My bed" value={myBed?.label ?? '—'} icon="check" tone="ok" foot={`Status: ${myBed ? statusLabel[myBed.status] : '—'}`} />
                  <StatCard label="Room type" value={`${myRoom.type}`} icon="snow" tone="info" foot={`${myRoom.seater}-seater · ${bedCounts(myRoom).available} beds free`} />
                  <StatCard label="Monthly rent" value={rupee(myRoom.monthlyFee)} icon="wallet" foot={`Semester ${rupee(myRoom.semesterFee)}`} />
                </div>

                <div className="card pad-lg">
                  <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}><Icon name="bed" size={17} /> Bed layout — {myRoom.number}</div>
                    <div className="row" style={{ gap: 8 }}>
                      <StatusBadge status={roomStatus(myRoom)} />
                      <Button size="sm" variant="ghost" icon="eye" onClick={() => { setDetail(myRoom); setDetailOpen(true) }}>Full room details</Button>
                    </div>
                  </div>
                  <BedLayout room={myRoom} />
                </div>

                <div className="grid g2">
                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 14 }}><Icon name="building" size={17} /> Room facilities</div>
                    <div className="fac-list">{myRoom.facilities.map((f) => <span key={f} className="chip-tag cyan">{f}</span>)}</div>
                    <div className="divider" />
                    <KV rows={[
                      ['Security deposit', rupee(myRoom.securityDeposit)],
                      ['Hostel', getHostel(myRoom.hostelId)?.name ?? '—'],
                      ['Warden desk', getHostel(myRoom.hostelId)?.contact ?? '—'],
                    ]} />
                  </div>

                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 14 }}><Icon name="wifi" size={17} /> Block occupancy snapshot</div>
                    <StackedBar
                      parts={[
                        { label: 'Occupied', value: ROOMS.filter((r) => r.buildingId === myRoom.buildingId).flatMap((r) => r.beds).filter((b) => b.status === 'occupied').length, color: 'var(--danger)' },
                        { label: 'Available', value: ROOMS.filter((r) => r.buildingId === myRoom.buildingId).flatMap((r) => r.beds).filter((b) => b.status === 'available').length, color: 'var(--ok)' },
                        { label: 'Reserved', value: ROOMS.filter((r) => r.buildingId === myRoom.buildingId).flatMap((r) => r.beds).filter((b) => b.status === 'reserved').length, color: 'var(--info)' },
                      ]}
                    />
                    <p className="tiny dim" style={{ marginTop: 14, marginBottom: 0 }}>
                      Occupancy is shown as aggregate counts only — never as a list of who lives where.
                    </p>
                  </div>
                </div>
              </>
            )}

            {section === 'mess' && (
              <>
                <div className="grid g4">
                  {MESS_TIMINGS.map((t) => (
                    <StatCard key={t.key} label={t.label} value={`${t.open} – ${t.close}`} icon="clock" foot={t.key === 'lunch' ? 'Two sittings: 12:30 & 13:30' : 'Carry your ID card'} />
                  ))}
                </div>

                <div className="grid g2">
                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 16 }}><Icon name="zap" size={17} /> Daily schedule</div>
                    <KV rows={[
                      ['Breakfast window', `${MESS_TIMINGS[0].open} – ${MESS_TIMINGS[0].close}`],
                      ['Lunch window', `${MESS_TIMINGS[1].open} – ${MESS_TIMINGS[1].close}`],
                      ['Snacks & tea', `${MESS_TIMINGS[2].open} – ${MESS_TIMINGS[2].close}`],
                      ['Dinner window', `${MESS_TIMINGS[3].open} – ${MESS_TIMINGS[3].close}`],
                      ['Gym', `${GYM_TIMING.open} – ${GYM_TIMING.close}`],
                      ['College classes', COLLEGE_TIMING.classes],
                      ['Library', COLLEGE_TIMING.library],
                    ]} />
                  </div>

                  <div className="card pad-lg">
                    <div className="card-title" style={{ marginBottom: 16 }}><Icon name="utensils" size={17} /> This week at a glance</div>
                    <div className="col" style={{ gap: 10 }}>
                      {MESS_WEEK.map((d) => (
                        <div className={`card tight ${d.day === todayDayName() ? 'glowing' : ''}`} key={d.day}>
                          <div className="row-between">
                            <b className="small">{d.day}</b>
                            {d.day === todayDayName() && <span className="chip-tag cyan">Today</span>}
                          </div>
                          <div className="tiny muted" style={{ marginTop: 5 }}>
                            {d.meals[1].items.slice(0, 3).join(' · ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'transport' && (
              <>
                <div className="grid g3">
                  <StatCard label="Next bus" value={nextBus.nextAt} icon="bus" tone="info" foot={nextBus.route} />
                  <StatCard label="Seats free" value={nextBus.seats - nextBus.booked} icon="users" tone="ok" foot={`Bus ${nextBus.busNo}`} />
                  <StatCard label="College hours" value={COLLEGE_TIMING.classes} icon="clock" foot="Return trips from 16:30" />
                </div>
                <div className="card pad-lg">
                  <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}><Icon name="map" size={17} /> Routes serving your hostel</div>
                    <LinkButton to="/transport" variant="ghost" size="sm" iconRight="arrowRight">Full schedule</LinkButton>
                  </div>
                  <div className="col" style={{ gap: 12 }}>
                    {TRANSPORT_ROUTES.slice(0, 4).map((r) => (
                      <div className="card tight" key={r.id}>
                        <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <b className="small">{r.route}</b>
                            <div className="tiny muted">Pickup: {r.stops[0].point} · {r.stops[0].depart} → {r.stops[r.stops.length - 1].arrive}</div>
                          </div>
                          <div className="row" style={{ gap: 10 }}>
                            <span className="chip-tag">{r.seats - r.booked} seats</span>
                            <span className={`badge ${r.status === 'On Time' ? 'available' : r.status === 'Delayed' ? 'pending' : 'reserved'}`}><i className="dot" />{r.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {section === 'complaints' && (
              <div className="card pad-lg">
                <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}><Icon name="clipboard" size={17} /> My complaints ({myComplaints.length})</div>
                  <LinkButton to="/complaints" variant="primary" size="sm" icon="plus">Raise a complaint</LinkButton>
                </div>
                {myComplaints.length === 0 ? (
                  <EmptyState icon="clipboard" title="No complaints yet" message="When you raise a ticket it will appear here with its full tracking timeline." action={<LinkButton to="/complaints" variant="primary" icon="plus">Raise a complaint</LinkButton>} />
                ) : (
                  <div className="col" style={{ gap: 14 }}>
                    {myComplaints.map((c) => (
                      <div className="card tight" key={c.id}>
                        <div className="row-between" style={{ gap: 10, flexWrap: 'wrap' }}>
                          <b>{c.title}</b>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="tiny muted" style={{ marginTop: 6 }}>{c.ticket} · {c.category} · {c.priority} priority · Room {c.roomNumber}</div>
                        <div className="timeline" style={{ marginTop: 14 }}>
                          {c.timeline.map((t, i) => (
                            <div className="tl-item" key={`${t.at}-${i}`} style={{ paddingBottom: 12 }}>
                              <span className={`tl-dot ${i === c.timeline.length - 1 ? '' : 'done'}`} />
                              <b className="small">{t.label}</b>
                              <div className="tiny muted">{new Date(t.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {t.by}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'payments' && (
              <>
                <div className="grid g4">
                  <StatCard label="Total fee" value={rupee(me?.feeTotal ?? 0)} icon="wallet" />
                  <StatCard label="Paid" value={rupee(balance?.paid ?? 0)} tone="ok" icon="check" />
                  <StatCard label="Pending" value={rupee(pendingFee)} tone={pendingFee ? 'danger' : 'ok'} icon="alert" foot="Due 30 Sept 2026" />
                  <StatCard label="Receipts" value={myPayments.length} icon="printer" foot="Downloadable from the ledger" />
                </div>
                <div className="card pad-lg">
                  <div className="card-title" style={{ marginBottom: 16 }}><Icon name="wallet" size={17} /> Fee ledger</div>
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>Receipt</th><th>Term</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {myPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="mono tiny">{p.receipt}</td>
                            <td>{p.term}</td>
                            <td>{new Date(p.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                            <td>{p.mode}</td>
                            <td><b>{rupee(p.amount)}</b></td>
                            <td><span className={`badge ${p.status === 'Paid' ? 'resolved' : 'pending'}`}><i className="dot" />{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                    <LinkButton to="/payments" variant="primary" size="sm" icon="wallet">Open payments page</LinkButton>
                  </div>
                </div>
              </>
            )}

            {section === 'contacts' && (
              <div className="grid g3">
                {EMERGENCY_CONTACTS.map((c) => (
                  <div className="card hoverable" key={c.label}>
                    <div className="row" style={{ gap: 12 }}>
                      <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                      <div>
                        <b className="small" style={{ display: 'block' }}>{c.label}</b>
                        <span className="mono tiny muted">{c.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============================= WARDEN ============================= */}
        {role === 'warden' && (
          <>
            {section === 'overview' && <WardenOverview />}

            {section === 'allocation' && (
              <div className="card pad-lg">
                <div className="card-title" style={{ marginBottom: 16 }}><Icon name="users" size={17} /> Pending room applications ({applications.length})</div>
                {applications.length === 0 ? (
                  <EmptyState icon="users" title="No pending applications" message="Every request has been processed. New applications from residents appear here instantly." />
                ) : (
                  <div className="col" style={{ gap: 14 }}>
                    {applications.map((a) => (
                      <div className="card tight" key={a.id}>
                        <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <b>{a.studentName} → Room {a.roomId}</b>
                            <div className="tiny muted" style={{ marginTop: 5 }}>
                              {a.studentId} · applied {new Date(a.appliedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                            {a.note && <div className="tiny" style={{ marginTop: 6, color: 'var(--text-2)' }}>“{a.note}”</div>}
                          </div>
                          <span className={`badge ${a.status === 'approved' ? 'resolved' : a.status === 'rejected' ? 'full' : 'pending'}`}><i className="dot" />{a.status}</span>
                        </div>
                        {a.status === 'pending' && (
                          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                            <Button size="xs" variant="primary" icon="check" onClick={async () => {
                              const ok = await confirm({ title: 'Approve this application?', message: `${a.studentName} will be allotted room ${a.roomId} and notified immediately. The bed status becomes occupied.`, confirmLabel: 'Approve' })
                              if (ok) decideApplication(a.id, 'approved')
                            }}>Approve</Button>
                            <Button size="xs" variant="ghost" icon="clock" onClick={() => decideApplication(a.id, 'waitlisted')}>Waitlist</Button>
                            <Button size="xs" variant="danger" icon="x" onClick={async () => {
                              const ok = await confirm({ title: 'Reject this application?', message: `${a.studentName}'s request for ${a.roomId} will be closed. They can apply again for another room.`, confirmLabel: 'Reject', danger: true })
                              if (ok) decideApplication(a.id, 'rejected')
                            }}>Reject</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'attendance' && <WardenAttendance />}

            {section === 'complaints' && (
              <div className="card pad-lg">
                <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}><Icon name="clipboard" size={17} /> Complaint queue</div>
                  <LinkButton to="/complaints" variant="ghost" size="sm" iconRight="arrowRight">Open complaint desk</LinkButton>
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Ticket</th><th>Title</th><th>Room</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {complaints.map((c) => (
                        <tr key={c.id}>
                          <td className="mono tiny">{c.ticket}</td>
                          <td>{c.title}</td>
                          <td>{c.roomNumber}</td>
                          <td><span className={`badge ${c.priority === 'high' ? 'full' : c.priority === 'medium' ? 'pending' : 'reserved'}`}><i className="dot" />{c.priority}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                              <Button size="xs" variant="ghost" onClick={() => setComplaintStatus(c.id, 'assigned', user?.name ?? 'Warden Office', 'Assigned from the warden dashboard.')}>Assign</Button>
                              <Button size="xs" variant="ghost" onClick={() => setComplaintStatus(c.id, 'inprogress', user?.name ?? 'Warden Office', 'Work started by the maintenance team.')}>Progress</Button>
                              <Button size="xs" variant="primary" onClick={() => setComplaintStatus(c.id, 'resolved', user?.name ?? 'Warden Office', 'Verified and closed.')}>Resolve</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'notices' && (
              <div className="card pad-lg">
                <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}><Icon name="bell" size={17} /> Notices published ({notices.length})</div>
                  <LinkButton to="/notices" variant="primary" size="sm" icon="plus">Publish a notice</LinkButton>
                </div>
                <div className="col" style={{ gap: 12 }}>
                  {notices.map((n) => (
                    <div className="card tight" key={n.id}>
                      <div className="row-between" style={{ gap: 10, flexWrap: 'wrap' }}>
                        <b className="small">{n.title}</b>
                        <span className="row" style={{ gap: 8 }}>
                          <span className="chip-tag">{n.category}</span>
                          {n.pinned && <span className="chip-tag violet">Pinned</span>}
                        </span>
                      </div>
                      <div className="tiny muted" style={{ marginTop: 5 }}>{n.date} · {n.by} · {n.audience}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================== MESS ============================= */}
        {role === 'mess' && (
          <>
            {section === 'overview' && (
              <>
                <div className="grid g4">
                  <StatCard label="Meals served today" value="1,284" icon="utensils" foot="Across 4 windows" />
                  <StatCard label="Avg. meal rating" value="4.3 / 5" tone="ok" icon="star" foot="From 216 responses this week" />
                  <StatCard label="Wastage" value="6.2%" tone="warn" icon="alert" foot="Target below 5%" />
                  <StatCard label="Special requests" value="14" tone="info" icon="clipboard" foot="Jain / no-onion meals" />
                </div>
              </>
            )}

            {section === 'menu' && <MenuManager />}

            {section === 'feedback' && <FeedbackBoard />}

            {section === 'timings' && (
              <div className="card pad-lg">
                <div className="card-title" style={{ marginBottom: 16 }}><Icon name="clock" size={17} /> Serving windows</div>
                <div className="grid g2" style={{ gap: 14 }}>
                  {MESS_TIMINGS.map((t) => (
                    <div className="card tight" key={t.key}>
                      <div className="row" style={{ gap: 12 }}>
                        <span className="meal-ico" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>{t.icon}</span>
                        <div className="grow">
                          <b className="small">{t.label}</b>
                          <div className="tiny muted">Serving {t.open} – {t.close}</div>
                        </div>
                        <Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Timing update queued', `${t.label} window changes are published to residents on save.`)}>Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================ TRANSPORT ========================== */}
        {role === 'transport' && (
          <>
            {section === 'overview' && (
              <>
                <div className="grid g4">
                  <StatCard label="Active buses" value={TRANSPORT_ROUTES.length} icon="bus" foot="2 spare vehicles on standby" />
                  <StatCard label="Seats booked" value={TRANSPORT_ROUTES.reduce((a, r) => a + r.booked, 0)} tone="info" icon="users" foot={`of ${TRANSPORT_ROUTES.reduce((a, r) => a + r.seats, 0)} total`} />
                  <StatCard label="On-time rate" value="92%" tone="ok" icon="trending" foot="Rolling 7-day average" />
                  <StatCard label="Delays flagged" value={TRANSPORT_ROUTES.filter((r) => r.status === 'Delayed').length} tone="warn" icon="alert" foot="Route 4 · traffic diversion" />
                </div>
              </>
            )}

            {section === 'routes' && (
              <div className="col" style={{ gap: 14 }}>
                {TRANSPORT_ROUTES.map((r) => (
                  <div className="card" key={r.id}>
                    <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <b>{r.route}</b>
                        <div className="tiny muted">Bus {r.busNo} · {r.driver} · {r.driverPhone}</div>
                      </div>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span className="chip-tag">{r.stops.length} stops</span>
                        <span className="chip-tag cyan">{r.seats - r.booked} seats free</span>
                        <Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Route updated', `${r.route} saved with its current pickup points and timings.`)}>Edit</Button>
                      </div>
                    </div>
                    <div className="divider" />
                    <div className="grid g4" style={{ gap: 12 }}>
                      {r.stops.map((s, i) => (
                        <div className="card tight" key={s.point}>
                          <div className="row" style={{ gap: 8, marginBottom: 5 }}><span className="pin">{i + 1}</span><b className="tiny">{s.point}</b></div>
                          <div className="tiny muted">Dep {s.depart} · Arr {s.arrive}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section === 'schedule' && (
              <div className="card pad-lg">
                <div className="card-title" style={{ marginBottom: 16 }}><Icon name="calendar" size={17} /> Schedule board</div>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>Route</th><th>Bus</th><th>Next departure</th><th>College in</th><th>College out</th><th>Status</th></tr></thead>
                    <tbody>
                      {TRANSPORT_ROUTES.map((r) => (
                        <tr key={r.id}>
                          <td>{r.route}</td>
                          <td className="mono tiny">{r.busNo}</td>
                          <td><b>{r.nextAt}</b></td>
                          <td>{r.collegeIn}</td>
                          <td>{r.collegeOut}</td>
                          <td>
                            <select
                              className="select" style={{ padding: '6px 30px 6px 10px', fontSize: '0.8rem' }}
                              defaultValue={r.status}
                              aria-label={`Status for ${r.route}`}
                              onChange={(e) => toast('success', 'Status updated', `${r.route} is now marked “${e.target.value}”.`) }
                            >
                              {['On Time', 'Delayed', 'Departed', 'Scheduled', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RoomDetail room={detail} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  )
}

/* ------------------------------ Warden blocks --------------------------- */
function WardenOverview() {
  const beds = ROOMS.flatMap((r) => r.beds)
  const byFloor = [0, 1, 2, 3].map((f) => {
    const rooms = ROOMS.filter((r) => r.floor === f)
    const b = rooms.flatMap((r) => r.beds)
    return {
      label: floorName(f),
      occupied: b.filter((x) => x.status === 'occupied').length,
      available: b.filter((x) => x.status === 'available').length,
      reserved: b.filter((x) => x.status === 'reserved').length,
      maintenance: b.filter((x) => x.status === 'maintenance').length,
    }
  })

  return (
    <>
      <div className="grid g4">
        <StatCard label="Rooms under management" value={ROOMS.length} icon="building" foot={`${STUDENTS.length} residents allotted`} />
        <StatCard label="Occupied beds" value={beds.filter((b) => b.status === 'occupied').length} tone="warn" icon="bed" />
        <StatCard label="Available beds" value={beds.filter((b) => b.status === 'available').length} tone="ok" icon="check" />
        <StatCard label="Needs attention" value={ROOMS.filter((r) => roomStatus(r) === 'maintenance').length} tone="danger" icon="alert" foot="Rooms under maintenance" />
      </div>

      <div className="grid g2">
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="layers" size={17} /> Bed status by floor</div>
          <StackedBar
            parts={[
              { label: 'Occupied', value: beds.filter((b) => b.status === 'occupied').length, color: 'var(--danger)' },
              { label: 'Available', value: beds.filter((b) => b.status === 'available').length, color: 'var(--ok)' },
              { label: 'Reserved', value: beds.filter((b) => b.status === 'reserved').length, color: 'var(--info)' },
              { label: 'Maintenance', value: beds.filter((b) => b.status === 'maintenance').length, color: 'var(--grey)' },
            ]}
          />
          <div className="divider" />
          <div className="col" style={{ gap: 12 }}>
            {byFloor.map((f) => (
              <div key={f.label}>
                <div className="row-between tiny" style={{ marginBottom: 6 }}>
                  <span>{f.label}</span>
                  <span className="muted">
                    <b style={{ color: 'var(--danger)' }}>{f.occupied}</b> occ · <b style={{ color: 'var(--ok)' }}>{f.available}</b> free · <b style={{ color: 'var(--info)' }}>{f.reserved}</b> res
                  </span>
                </div>
                <Progress pct={(f.occupied / (f.occupied + f.available + f.reserved + f.maintenance || 1)) * 100} />
              </div>
            ))}
          </div>
        </div>

        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="pie" size={17} /> Block occupancy share</div>
          <DonutChart
            data={[
              { label: 'Aravalli (ARV)', value: ROOMS.filter((r) => r.buildingId === 'B1' && roomStatus(r) !== 'maintenance').length, color: '#8b5cf6' },
              { label: 'Nilgiri (NLG)', value: ROOMS.filter((r) => r.buildingId === 'B2' && roomStatus(r) !== 'maintenance').length, color: '#3b82f6' },
              { label: 'Vindhya (VND)', value: ROOMS.filter((r) => r.buildingId === 'B3' && roomStatus(r) !== 'maintenance').length, color: '#22d3ee' },
            ]}
            centerValue={`${ROOMS.length}`}
            centerLabel="rooms"
          />
        </div>
      </div>

      <div className="card pad-lg">
        <div className="card-title" style={{ marginBottom: 16 }}><Icon name="grid" size={17} /> Live room grid</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {ROOMS.map((r) => (
            <div className={`room-block ${roomStatus(r)}`} key={r.id} style={{ cursor: 'default' }}>
              <b>{r.number}</b>
              <span className="rb-sub">{bedCounts(r).available}/{bedCounts(r).total} free</span>
              <span className="rb-beds">{r.beds.map((b) => <i key={b.id} className={`rb-bed ${b.status}`} />)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function WardenAttendance() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const present = [182, 190, 178, 195, 188, 142, 120]
  return (
    <>
      <div className="grid g4">
        <StatCard label="Residents present" value="188 / 204" tone="ok" icon="users" foot={`${todayShort()} · night check`} />
        <StatCard label="Night check-ins" value="184" icon="clock" foot="4 pending after curfew" />
        <StatCard label="Average attendance" value="91%" tone="info" icon="calendar" foot="Rolling 7 days" />
        <StatCard label="Visitors logged" value="26" icon="shield" foot="All verified at the gate" />
      </div>
      <div className="card pad-lg">
        <div className="card-title" style={{ marginBottom: 16 }}><Icon name="trending" size={17} /> Hostel presence this week</div>
        <LineChart points={days.map((d, i) => ({ label: d, value: present[i] }))} color="#34d399" />
      </div>
    </>
  )
}

/* -------------------------- Mess staff blocks --------------------------- */
function MenuManager() {
  const { toast } = useApp()
  const [day, setDay] = useState(MESS_WEEK[0].day)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const current = MESS_WEEK.find((d) => d.day === day) ?? MESS_WEEK[0]

  return (
    <div className="card pad-lg">
      <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}><Icon name="utensils" size={17} /> Menu manager</div>
        <Tabs ariaLabel="Select day" tabs={MESS_WEEK.map((d) => ({ id: d.day, label: d.short }))} value={day} onChange={setDay} />
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        {current.meals.map((m) => {
          const key = `${day}-${m.key}`
          return (
            <Field key={m.key} label={`${m.name} · ${m.open}–${m.close}`} id={`menu-${key}`} hint="One item per line">
              <textarea
                id={`menu-${key}`} className="textarea" style={{ minHeight: 92 }}
                value={draft[key] ?? m.items.join('\n')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </Field>
          )
        })}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <Button variant="ghost" icon="refresh" onClick={() => setDraft({})}>Discard changes</Button>
        <Button variant="primary" icon="check" onClick={() => toast('success', 'Menu published', `${day}'s menu is now visible to all residents on the Mess page.`)}>
          Publish {day}'s menu
        </Button>
      </div>
    </div>
  )
}

function FeedbackBoard() {
  const { toast } = useApp()
  const items = [
    { student: 'Aarav S.', meal: 'Dinner', day: 'Friday', rating: 5, text: 'Ice cream after dinner was a great touch. Please keep the counter open till 22:00.' },
    { student: 'Diya N.', meal: 'Breakfast', day: 'Thursday', rating: 3, text: 'Upma was a little dry today.' },
    { student: 'Rohan V.', meal: 'Lunch', day: 'Wednesday', rating: 4, text: 'Chole bhature was excellent, though the queue was long.' },
    { student: 'Ananya R.', meal: 'Snacks', day: 'Tuesday', rating: 2, text: 'The bread pakoda was cold by 17:45.' },
  ]
  const avg = (items.reduce((a, i) => a + i.rating, 0) / items.length).toFixed(1)

  return (
    <>
      <div className="grid g3">
        <StatCard label="Average rating" value={`${avg} / 5`} tone="ok" icon="star" foot={`${items.length} responses today`} />
        <StatCard label="Needs action" value={items.filter((i) => i.rating <= 3).length} tone="warn" icon="alert" foot="Rated 3 stars or below" />
        <StatCard label="Feedback channel" value="Open" tone="info" icon="mail" foot="Mess page · students can rate every meal" />
      </div>
      <div className="col" style={{ gap: 14 }}>
        {items.map((f) => (
          <div className="card" key={f.text}>
            <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div>
                <b className="small">{f.student} · {f.meal} ({f.day})</b>
                <p className="small" style={{ margin: '6px 0 0' }}>“{f.text}”</p>
              </div>
              <span className="chip-tag" style={{ color: f.rating >= 4 ? 'var(--ok)' : f.rating === 3 ? 'var(--warn)' : 'var(--danger)' }}>
                {f.rating} / 5
              </span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Button size="xs" variant="ghost" icon="check" onClick={() => toast('success', 'Feedback acknowledged', `${f.student}'s note on ${f.meal} (${f.day}) is marked as reviewed.`)}>Acknowledge</Button>
              <Button size="xs" variant="ghost" icon="mail" onClick={() => toast('info', 'Reply drafted', `A response to ${f.student} will be posted on the mess feedback thread after review.`)}>Reply</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
