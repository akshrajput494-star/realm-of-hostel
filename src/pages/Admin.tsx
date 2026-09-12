import React, { useMemo, useState } from 'react'
import {
  BUILDINGS, COMPLAINT_CATEGORIES, FLOORS, HOSTELS, MESS_WEEK, ROOMS, STUDENTS, TRANSPORT_ROUTES,
  BedStatus, amountsFor, bedCounts, floorName, getBuilding, getHostel, hostelStats, roomStatus, rupee, statusLabel,
} from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { useRouter } from '../lib/router'
import { BarChart, DonutChart, LineChart, ProgressRing, Spark, StackedBar } from '../lib/charts'
import { Button, EmptyState, LinkButton, SectionHead, StatCard, StatusBadge } from '../lib/ui'
import { useApp } from '../lib/store'

type SectionId =
  | 'hostels' | 'buildings' | 'floors' | 'rooms' | 'beds' | 'students'
  | 'applications' | 'complaints' | 'mess' | 'payments' | 'transport' | 'notices'

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: 'hostels', label: 'Hostels', icon: 'building' },
  { id: 'buildings', label: 'Buildings', icon: 'layers' },
  { id: 'floors', label: 'Floors', icon: 'grid' },
  { id: 'rooms', label: 'Rooms', icon: 'bed' },
  { id: 'beds', label: 'Beds', icon: 'list' },
  { id: 'students', label: 'Students', icon: 'users' },
  { id: 'applications', label: 'Room Applications', icon: 'clipboard' },
  { id: 'complaints', label: 'Complaints', icon: 'alert' },
  { id: 'mess', label: 'Mess Menus', icon: 'utensils' },
  { id: 'payments', label: 'Payments', icon: 'wallet' },
  { id: 'transport', label: 'Transport Schedules', icon: 'bus' },
  { id: 'notices', label: 'Notices', icon: 'bell' },
]

export function Admin() {
  const { user, complaints, payments, applications, notices, decideApplication, setComplaintStatus, removeNotice, confirm, toast } = useApp()
  const { navigate } = useRouter()
  const stats = hostelStats()
  const [section, setSection] = useState<SectionId>('hostels')
  const [search, setSearch] = useState('')
  const [bedOverrides, setBedOverrides] = useState<Record<string, BedStatus>>({})

  const isAdmin = user?.role === 'admin'
  const isWardenAdmin = isAdmin || user?.role === 'warden'

  /* Admin-only console. */
  if (!isWardenAdmin) {
    return (
      <div className="page-enter wrap section">
        <SectionHead eyebrow="Administrator" title="Admin console" sub="This workspace contains estate-wide records and is restricted to administrators and wardens." />
        <EmptyState
          icon="lock"
          title="Administrator access required"
          message={user
            ? `You are signed in as ${user.name} (${user.role}). Sign in with admin@roh.demo to open the full estate console.`
            : 'Sign in with the demo administrator account to view hostels, buildings, rooms, beds, students, fees, complaints, mess and transport management.'}
          action={<LinkButton to="/login?demo=1" variant="primary" icon="key">Demo Login as Administrator</LinkButton>}
        />
      </div>
    )
  }

  const beds = ROOMS.flatMap((r) => r.beds.map((b) => ({ ...b, status: bedOverrides[b.id] ?? b.status, room: r })))
  const byCategory = COMPLAINT_CATEGORIES.map((c) => ({ label: c, value: complaints.filter((x) => x.category === c).length })).filter((x) => x.value > 0)

  // Estate fee position, derived from the same balance function the student pages use.
  const ledgers = STUDENTS.map((s) => amountsFor(s, payments))
  const feeCollected = ledgers.reduce((a, l) => a + l.paid, 0)
  const feePending = ledgers.reduce((a, l) => a + l.pending, 0)

  const attendance = [
    { label: 'Mon', value: 182 }, { label: 'Tue', value: 190 }, { label: 'Wed', value: 178 },
    { label: 'Thu', value: 195 }, { label: 'Fri', value: 188 }, { label: 'Sat', value: 142 }, { label: 'Sun', value: 120 },
  ]

  const feeTrend = [
    { label: 'Jul', value: 62 }, { label: 'Aug', value: 74 }, { label: 'Sep', value: 88 },
    { label: 'Oct', value: 91 }, { label: 'Nov', value: 95 }, { label: 'Dec', value: 97 },
  ]

  const q = search.trim().toLowerCase()

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow={`Administrator console · ${user?.name}`}
        title="Estate control centre"
        sub="Every hostel, building, floor, room, bed, resident, rupee and ticket in one dashboard — with the twelve management sections below."
        right={<span className="chip-tag cyan"><Icon name="shield" size={12} /> Full estate access · role verified</span>}
      />

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <StatCard label="Total hostels" value={stats.totalHostels} icon="building" foot={`${stats.totalBuildings} buildings · ${stats.totalFloors} floors`} />
        <StatCard label="Total rooms" value={stats.totalRooms} icon="grid" foot={`${stats.maintRooms} rooms under maintenance`} />
        <StatCard label="Total beds" value={stats.totalBeds} icon="bed" foot="3-seater and 4-seater mix" />
        <StatCard label="Occupancy" value={`${stats.occupancyPct}%`} tone="info" icon="trending" spark={<Spark values={[52, 58, 63, 69, 72, 75, stats.occupancyPct]} />} />
      </div>

      <div className="grid g4" style={{ marginBottom: 26 }}>
        <StatCard label="Occupied beds" value={stats.occupied} tone="warn" icon="users" />
        <StatCard label="Available beds" value={stats.available} tone="ok" icon="check" foot={`${stats.reserved} reserved · ${stats.maintenanceBeds} blocked`} />
        <StatCard label="Pending applications" value={applications.filter((a) => a.status === 'pending').length} tone="info" icon="clipboard" foot={`${applications.length} total requests`} />
        <StatCard label="Pending complaints" value={complaints.filter((c) => c.status !== 'resolved').length} tone="danger" icon="alert" foot={`${complaints.length} tickets logged`} />
      </div>

      {/* ----------------------------- Charts ----------------------------- */}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="pie" size={17} /> Room & bed occupancy</div>
          <DonutChart
            data={[
              { label: 'Occupied', value: stats.occupied, color: '#fb7185' },
              { label: 'Available', value: stats.available, color: '#34d399' },
              { label: 'Reserved', value: stats.reserved, color: '#38bdf8' },
              { label: 'Maintenance', value: stats.maintenanceBeds, color: '#94a3b8' },
            ]}
            centerValue={`${stats.occupancyPct}%`}
            centerLabel="occupied"
          />
        </div>

        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="bed" size={17} /> Bed availability by building</div>
          <BarChart
            horizontal
            data={BUILDINGS.map((b) => {
              const rb = ROOMS.filter((r) => r.buildingId === b.id).flatMap((r) => r.beds)
              return { label: `${b.code} · ${b.name}`, value: rb.filter((x) => x.status === 'available').length }
            })}
            suffix=" beds"
          />
          <div className="divider" />
          <StackedBar
            parts={[
              { label: 'Occupied', value: stats.occupied, color: '#fb7185' },
              { label: 'Available', value: stats.available, color: '#34d399' },
              { label: 'Reserved', value: stats.reserved, color: '#38bdf8' },
              { label: 'Blocked', value: stats.maintenanceBeds, color: '#94a3b8' },
            ]}
          />
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 26 }}>
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="clipboard" size={17} /> Complaints by category</div>
          {byCategory.length ? (
            <BarChart data={byCategory.map((c) => ({ ...c, color: 'url(#barGrad)' }))} height={170} />
          ) : (
            <span className="small muted">No complaints logged.</span>
          )}
          <div className="chart-legend">
            {byCategory.map((c) => (
              <span key={c.label}><i style={{ background: 'var(--violet)' }} />{c.label} · <b>{c.value}</b></span>
            ))}
          </div>
        </div>

        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="wallet" size={17} /> Fee collection trend</div>
          <LineChart points={feeTrend} color="#34d399" suffix="%" />
          <div className="divider" />
          <div className="row-between small"><span className="muted">Collected this semester</span><b>{rupee(feeCollected)}</b></div>
          <div className="row-between small" style={{ marginTop: 8 }}>
            <span className="muted">Pending across residents</span>
            <b style={{ color: 'var(--danger)' }}>{rupee(feePending)}</b>
          </div>
        </div>

        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="calendar" size={17} /> Daily attendance</div>
          <LineChart points={attendance} color="#22d3ee" />
          <div className="divider" />
          <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
            <ProgressRing pct={91} size={84} label="avg" />
            <div className="grow">
              <div className="row-between small"><span className="muted">Present today</span><b>188 / 204</b></div>
              <div className="row-between small" style={{ marginTop: 8 }}><span className="muted">Night check-ins</span><b>184</b></div>
              <div className="row-between small" style={{ marginTop: 8 }}><span className="muted">Visitors logged</span><b>26</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------- Management --------------------------- */}
      <div className="card pad-lg">
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}><Icon name="layers" size={17} /> Management sections</div>
          <div className="search" style={{ minWidth: 240 }}>
            <Icon name="search" size={17} />
            <input
              className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records in this section…" aria-label="Search management records"
            />
          </div>
        </div>

        <div className="day-tabs" style={{ marginBottom: 18 }} role="tablist" aria-label="Management sections">
          {SECTIONS.map((s) => (
            <button key={s.id} role="tab" aria-selected={section === s.id} className={`chip ${section === s.id ? 'on' : ''}`} onClick={() => setSection(s.id)}>
              <Icon name={s.icon} size={13} /> {s.label}
            </button>
          ))}
        </div>

        {/* Hostels */}
        {section === 'hostels' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Hostel</th><th>Code</th><th>Campus</th><th>Warden</th><th>Contact</th><th>Buildings</th><th>Rooms</th><th>Action</th></tr></thead>
              <tbody>
                {HOSTELS.filter((h) => !q || `${h.name} ${h.code} ${h.campus}`.toLowerCase().includes(q)).map((h) => (
                  <tr key={h.id}>
                    <td><b>{h.name}</b></td>
                    <td className="mono tiny">{h.code}</td>
                    <td>{h.campus}</td>
                    <td>{h.warden}</td>
                    <td className="mono tiny">{h.contact}</td>
                    <td>{h.blocks}</td>
                    <td>{ROOMS.filter((r) => r.hostelId === h.id).length}</td>
                    <td><Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Hostel record', `${h.name} details are editable by the estate administrator (demo).`)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Buildings */}
        {section === 'buildings' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Building</th><th>Code</th><th>Hostel</th><th>Floors</th><th>Rooms</th><th>Beds</th><th>Commissioned</th><th>Action</th></tr></thead>
              <tbody>
                {BUILDINGS.filter((b) => !q || `${b.name} ${b.code}`.toLowerCase().includes(q)).map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.name}</b></td>
                    <td className="mono tiny">{b.code}</td>
                    <td>{getHostel(b.hostelId)?.name}</td>
                    <td>{b.floorsLabel}</td>
                    <td>{ROOMS.filter((r) => r.buildingId === b.id).length}</td>
                    <td>{ROOMS.filter((r) => r.buildingId === b.id).flatMap((r) => r.beds).length}</td>
                    <td>{b.yearBuilt}</td>
                    <td><Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Building record', `${b.name} opens in the estate editor (demo).`)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Floors */}
        {section === 'floors' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Building</th><th>Floor</th><th>Rooms</th><th>Beds</th><th>Available</th><th>Occupied</th><th>Occupancy</th></tr></thead>
              <tbody>
                {BUILDINGS.flatMap((b) => FLOORS.map((f) => ({ b, f })))
                  .filter(({ b, f }) => !q || `${b.code} ${b.name} ${floorName(f)}`.toLowerCase().includes(q))
                  .map(({ b, f }) => {
                    const rooms = ROOMS.filter((r) => r.buildingId === b.id && r.floor === f)
                    const bs = rooms.flatMap((r) => r.beds)
                    const occ = bs.filter((x) => x.status === 'occupied').length
                    return (
                      <tr key={`${b.id}-${f}`}>
                        <td>{b.code} · {b.name}</td>
                        <td>{floorName(f)}</td>
                        <td>{rooms.length}</td>
                        <td>{bs.length}</td>
                        <td><b style={{ color: 'var(--ok)' }}>{bs.filter((x) => x.status === 'available').length}</b></td>
                        <td><b style={{ color: 'var(--danger)' }}>{occ}</b></td>
                        <td style={{ minWidth: 140 }}>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${bs.length ? (occ / bs.length) * 100 : 0}%` }} /></div>
                          <span className="tiny muted">{bs.length ? Math.round((occ / bs.length) * 100) : 0}%</span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rooms */}
        {section === 'rooms' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Room</th><th>Block</th><th>Floor</th><th>Type</th><th>Seater</th><th>Free / Total</th><th>Monthly</th><th>Semester</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {ROOMS.filter((r) => !q || `${r.number} ${r.type} ${getBuilding(r.buildingId)?.code}`.toLowerCase().includes(q)).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.number}</b></td>
                    <td>{getBuilding(r.buildingId)?.code}</td>
                    <td>{floorName(r.floor)}</td>
                    <td>{r.type}</td>
                    <td>{r.seater}-seater</td>
                    <td>{bedCounts(r).available} / {bedCounts(r).total}</td>
                    <td>{rupee(r.monthlyFee)}</td>
                    <td>{rupee(r.semesterFee)}</td>
                    <td><StatusBadge status={roomStatus(r)} /></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Button size="xs" variant="ghost" icon="eye" onClick={() => navigate(`/rooms/${r.id}`)}>View</Button>
                        <Button size="xs" variant="ghost" icon="info" onClick={() => toast('info', `Room ${r.number}`, `${r.facilities.join(', ')}`)}>Facilities</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Beds */}
        {section === 'beds' && (
          <>
            <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <span className="small muted">Block or release individual beds. Changes are applied to this demo session instantly.</span>
              <span className="chip-tag">{beds.filter((b) => b.status === 'available').length} available · {beds.filter((b) => b.status === 'maintenance').length} blocked</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Bed</th><th>Room</th><th>Block</th><th>Floor</th><th>Status</th><th>Occupant</th><th>Action</th></tr></thead>
                <tbody>
                  {beds
                    .filter((b) => !q || `${b.id} ${b.room.number}`.toLowerCase().includes(q))
                    .slice(0, 60)
                    .map((b) => (
                      <tr key={b.id}>
                        <td className="mono tiny">{b.label}</td>
                        <td><b>{b.room.number}</b></td>
                        <td>{getBuilding(b.room.buildingId)?.code}</td>
                        <td>{floorName(b.room.floor)}</td>
                        <td>
                          <span className={`badge ${b.status === 'occupied' ? 'full' : b.status === 'available' ? 'available' : b.status === 'reserved' ? 'reserved' : 'maintenance'}`}>
                            <i className="dot" />{statusLabel[b.status]}
                          </span>
                        </td>
                        <td>{b.studentId ? (STUDENTS.find((s) => s.id === b.studentId)?.name ?? '—') : '—'}</td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                            <Button
                              size="xs" variant="ghost" icon="alert"
                              disabled={b.status === 'maintenance'}
                              onClick={() => { setBedOverrides((o) => ({ ...o, [b.id]: 'maintenance' })); toast('warn', 'Bed blocked', `${b.room.number} · ${b.label} is now under maintenance and hidden from applicants.`) }}
                            >
                              Block
                            </Button>
                            <Button
                              size="xs" variant="ghost" icon="check"
                              disabled={b.status === 'available'}
                              onClick={() => { setBedOverrides((o) => ({ ...o, [b.id]: 'available' })); toast('success', 'Bed released', `${b.room.number} · ${b.label} is now available for allocation.`) }}
                            >
                              Release
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Students */}
        {section === 'students' && (
          <>
            <div className="notice-strip" style={{ marginBottom: 12 }}>
              <Icon name="lock" size={16} />
              <span className="small">Private records. This table is visible only to wardens and administrators — never to visitors or other students.</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Student</th><th>Roll no.</th><th>Course</th><th>Year</th><th>Room</th><th>Bed</th><th>Fee status</th><th>Attendance</th><th>Contact</th></tr></thead>
                <tbody>
                  {STUDENTS.filter((s) => !q || `${s.name} ${s.rollNo} ${s.course}`.toLowerCase().includes(q)).map((s) => {
                    const due = amountsFor(s, payments).pending
                    return (
                      <tr key={s.id}>
                        <td><b>{s.name}</b></td>
                        <td className="mono tiny">{s.rollNo}</td>
                        <td>{s.course}</td>
                        <td>{s.year}</td>
                        <td>{s.roomId}</td>
                        <td className="mono tiny">{s.bedId.split('-').pop()}</td>
                        <td>
                          {due <= 0
                            ? <span className="badge resolved"><i className="dot" />Paid</span>
                            : <span className="badge pending"><i className="dot" />Due {rupee(due)}</span>}
                        </td>
                        <td>{s.attendancePct}%</td>
                        <td className="mono tiny">{s.phone}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Applications */}
        {section === 'applications' && (
          applications.length === 0 ? (
            <EmptyState icon="clipboard" title="No room applications" message="Applications submitted from the room explorer appear here for approval." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Application</th><th>Student</th><th>Room</th><th>Applied</th><th>Note</th><th>Status</th><th>Decision</th></tr></thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id}>
                      <td className="mono tiny">{a.id}</td>
                      <td>{a.studentName}<div className="tiny dim">{a.studentId}</div></td>
                      <td><b>{a.roomId}</b></td>
                      <td className="tiny">{new Date(a.appliedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="tiny muted" style={{ maxWidth: 220 }}>{a.note ?? '—'}</td>
                      <td>
                        <span className={`badge ${a.status === 'approved' ? 'resolved' : a.status === 'rejected' ? 'full' : a.status === 'waitlisted' ? 'reserved' : 'pending'}`}>
                          <i className="dot" />{a.status}
                        </span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          <Button size="xs" variant="primary" disabled={a.status === 'approved'} onClick={async () => {
                            const ok = await confirm({ title: 'Approve application?', message: `${a.studentName} will be allotted ${a.roomId}.`, confirmLabel: 'Approve' })
                            if (ok) decideApplication(a.id, 'approved')
                          }}>Approve</Button>
                          <Button size="xs" variant="ghost" disabled={a.status === 'waitlisted'} onClick={() => decideApplication(a.id, 'waitlisted')}>Waitlist</Button>
                          <Button size="xs" variant="danger" disabled={a.status === 'rejected'} onClick={async () => {
                            const ok = await confirm({ title: 'Reject application?', message: `${a.studentName}'s request for ${a.roomId} will be closed.`, confirmLabel: 'Reject', danger: true })
                            if (ok) decideApplication(a.id, 'rejected')
                          }}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Complaints */}
        {section === 'complaints' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Ticket</th><th>Category</th><th>Title</th><th>Room</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {complaints.filter((c) => !q || `${c.ticket} ${c.title} ${c.category} ${c.roomNumber}`.toLowerCase().includes(q)).map((c) => (
                  <tr key={c.id}>
                    <td className="mono tiny">{c.ticket}</td>
                    <td>{c.category}</td>
                    <td>{c.title}</td>
                    <td>{c.roomNumber}</td>
                    <td><span className={`badge ${c.priority === 'high' ? 'full' : c.priority === 'medium' ? 'pending' : 'reserved'}`}><i className="dot" />{c.priority}</span></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Button size="xs" variant="ghost" onClick={() => setComplaintStatus(c.id, 'assigned', user?.name ?? 'Admin', 'Assigned by the administrator.')}>Assign</Button>
                        <Button size="xs" variant="ghost" onClick={() => setComplaintStatus(c.id, 'inprogress', user?.name ?? 'Admin', 'Work started.')}>Progress</Button>
                        <Button size="xs" variant="primary" disabled={c.status === 'resolved'} onClick={() => setComplaintStatus(c.id, 'resolved', user?.name ?? 'Admin', 'Closed by the administrator.')}>Resolve</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mess */}
        {section === 'mess' && (
          <>
            <div className="notice-strip" style={{ marginBottom: 12 }}>
              <Icon name="utensils" size={16} />
              <span className="small">Mess staff publish menus from their own dashboard. Administrators can review and override here.</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snacks</th><th>Dinner</th><th>Special</th></tr></thead>
                <tbody>
                  {MESS_WEEK.filter((d) => !q || d.day.toLowerCase().includes(q)).map((d) => (
                    <tr key={d.day}>
                      <td><b>{d.day}</b></td>
                      {d.meals.map((m) => <td className="tiny" key={m.key}>{m.items.slice(0, 3).join(', ')}</td>)}
                      <td className="tiny muted">{d.special ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <Button variant="ghost" icon="refresh" onClick={() => toast('info', 'Menu revision queued', 'Menus are versioned so residents can see what changed and why.')}>Revise menu version</Button>
            </div>
          </>
        )}

        {/* Payments */}
        {section === 'payments' && (
          <>
            <div className="grid g3" style={{ marginBottom: 14 }}>
              <StatCard label="Collected (semester)" value={rupee(feeCollected)} tone="ok" icon="check" />
              <StatCard label="Pending" value={rupee(feePending)} tone="danger" icon="alert" />
              <StatCard label="Transactions logged" value={payments.length} icon="wallet" foot="Demo ledger entries" />
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Receipt</th><th>Student</th><th>Term</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {payments.filter((p) => !q || `${p.receipt} ${p.term} ${p.mode}`.toLowerCase().includes(q)).map((p) => (
                    <tr key={p.id}>
                      <td className="mono tiny">{p.receipt}</td>
                      <td>{STUDENTS.find((s) => s.id === p.studentId)?.name ?? 'Guest'}</td>
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
          </>
        )}

        {/* Transport */}
        {section === 'transport' && (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Route</th><th>Bus</th><th>Driver</th><th>Stops</th><th>Seats free</th><th>Next</th><th>Status</th></tr></thead>
              <tbody>
                {TRANSPORT_ROUTES.filter((r) => !q || `${r.route} ${r.busNo} ${r.driver}`.toLowerCase().includes(q)).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.route}</b></td>
                    <td className="mono tiny">{r.busNo}</td>
                    <td>{r.driver}<div className="tiny dim">{r.driverPhone}</div></td>
                    <td>{r.stops.length}</td>
                    <td>{r.seats - r.booked} / {r.seats}</td>
                    <td><b>{r.nextAt}</b></td>
                    <td>
                      <span className={`badge ${r.status === 'On Time' ? 'available' : r.status === 'Delayed' ? 'pending' : r.status === 'Cancelled' ? 'full' : 'reserved'}`}>
                        <i className="dot" />{r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notices */}
        {section === 'notices' && (
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <LinkButton to="/notices" variant="primary" size="sm" icon="plus">Publish from notice board</LinkButton>
            </div>
            {notices.map((n) => (
              <div className="card tight" key={n.id}>
                <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <b className="small">{n.title}</b>
                    <div className="tiny muted" style={{ marginTop: 4 }}>{n.date} · {n.category} · {n.by} · {n.audience}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {n.pinned && <span className="chip-tag violet">Pinned</span>}
                    <Button size="xs" variant="danger" icon="trash" onClick={async () => {
                      const ok = await confirm({ title: 'Take down this notice?', message: `“${n.title}” will be removed from every dashboard immediately.`, confirmLabel: 'Take down', danger: true })
                      if (ok) removeNotice(n.id)
                    }}>Take down</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
