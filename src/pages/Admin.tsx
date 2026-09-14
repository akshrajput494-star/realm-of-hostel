import React, { useMemo, useState } from 'react'
import {
  BUILDINGS, COMPLAINT_CATEGORIES, FLOORS, HOSTELS, MESS_WEEK, ROOMS, STUDENTS, TRANSPORT_ROUTES,
  BedStatus, amountsFor, bedCounts, floorName, getBuilding, getHostel, hostelStats, roomStatus, rupee, statusLabel,
} from '../data/mock'
import { Icon, IconName } from '../lib/icons'
import { useRouter } from '../lib/router'
import { Button, EmptyState, Field, LinkButton, Modal, SectionHead, StatCard, StatusBadge, Tag } from '../lib/ui'
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
  const { user, complaints, payments, applications, notices, students, addStudent, removeStudent, decideApplication, setComplaintStatus, addNotice, removeNotice, confirm, toast } = useApp()
  const { navigate } = useRouter()
  const stats = hostelStats()
  const [section, setSection] = useState<SectionId>('hostels')
  const [search, setSearch] = useState('')
  const [bedOverrides, setBedOverrides] = useState<Record<string, BedStatus>>({})
  const [emergencyLock, setEmergencyLock] = useState(false)

  /* Modal state for broadcasting notices */
  const [noticeModal, setNoticeModal] = useState(false)
  const [newNotice, setNewNotice] = useState<{
    title: string
    category: 'General' | 'Maintenance' | 'Mess' | 'Fees' | 'Transport' | 'Event' | 'Safety'
    content: string
    pinned: boolean
  }>({ title: '', category: 'General', content: '', pinned: false })

  /* Modal state for adding new student */
  const [studentModal, setStudentModal] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    rollNo: '',
    course: 'B.Tech CSE',
    year: '1',
    phone: '',
    guardian: '',
    guardianPhone: '',
    hostelId: 'H1',
    buildingId: 'B1',
    roomId: 'ARV-101',
    bedId: 'ARV-101-B1',
    feeTotal: 85000,
    feePaid: 45000,
  })

  const isAdmin = user?.role === 'admin'
  const isWardenAdmin = isAdmin || user?.role === 'warden'

  /* Admin-only console guard */
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

  // Estate fee position
  const ledgers = STUDENTS.map((s) => amountsFor(s, payments))
  const feeCollected = ledgers.reduce((a, l) => a + l.paid, 0)
  const feePending = ledgers.reduce((a, l) => a + l.pending, 0)
  const collectionPct = Math.round((feeCollected / (feeCollected + feePending)) * 100)

  const pendingApps = applications.filter((a) => a.status === 'pending')
  const openComplaints = complaints.filter((c) => c.status !== 'resolved')

  const q = search.trim().toLowerCase()

  /* Quick action handlers */
  const handleExportAudit = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      feeCollected,
      feePending,
      totalStudents: STUDENTS.length,
      pendingApplications: pendingApps.length,
      openComplaints: openComplaints.length,
    }, null, 2))
    const dl = document.createElement('a')
    dl.setAttribute("href", dataStr)
    dl.setAttribute("download", `ROH_Estate_Audit_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(dl)
    dl.click()
    dl.remove()
    toast('success', 'Audit report exported', 'Downloaded estate summary data JSON file.')
  }

  const handleSendReminders = async () => {
    const ok = await confirm({
      title: 'Broadcast fee reminders?',
      message: `Send automated payment reminders to ${STUDENTS.filter((s) => amountsFor(s, payments).pending > 0).length} students with pending dues?`,
      confirmLabel: 'Send reminders',
    })
    if (ok) {
      toast('success', 'Payment reminders sent', 'Notifications dispatched to all residents with outstanding fee balances.')
    }
  }

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNotice.title.trim() || !newNotice.content.trim()) {
      toast('warn', 'Incomplete notice', 'Please provide both a title and notice content.')
      return
    }
    addNotice({
      title: newNotice.title.trim(),
      category: newNotice.category,
      body: newNotice.content.trim(),
      date: new Date().toISOString().slice(0, 10),
      by: `${user?.name || 'System'} (Admin)`,
      pinned: newNotice.pinned,
      audience: 'All Residents & Staff',
    })
    setNewNotice({ title: '', category: 'General', content: '', pinned: false })
    setNoticeModal(false)
    toast('success', 'Notice published', 'Circular has been broadcast to all resident dashboards.')
  }

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudent.name.trim() || !newStudent.rollNo.trim() || !newStudent.phone.trim()) {
      toast('warn', 'Incomplete details', 'Please provide student name, roll number, and phone number.')
      return
    }
    addStudent({
      name: newStudent.name.trim(),
      email: newStudent.email.trim() || `${newStudent.rollNo.trim().toLowerCase()}@roh.edu.in`,
      rollNo: newStudent.rollNo.trim(),
      course: newStudent.course.trim(),
      year: newStudent.year,
      phone: newStudent.phone.trim(),
      guardian: newStudent.guardian.trim() || 'Parent / Guardian',
      guardianPhone: newStudent.guardianPhone.trim() || newStudent.phone.trim(),
      hostelId: newStudent.hostelId,
      buildingId: newStudent.buildingId,
      roomId: newStudent.roomId.trim(),
      bedId: newStudent.bedId.trim(),
      feeTotal: Number(newStudent.feeTotal) || 85000,
      feePaid: Number(newStudent.feePaid) || 0,
    })
    setNewStudent({
      name: '', email: '', rollNo: '', course: 'B.Tech CSE', year: '1', phone: '',
      guardian: '', guardianPhone: '', hostelId: 'H1', buildingId: 'B1', roomId: 'ARV-101',
      bedId: 'ARV-101-B1', feeTotal: 85000, feePaid: 45000,
    })
    setStudentModal(false)
  }

  const handleRemoveStudent = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remove student record?',
      message: `Are you sure you want to remove ${name} (${id}) from the active hostel roster?`,
      confirmLabel: 'Remove student',
      danger: true,
    })
    if (ok) {
      removeStudent(id)
    }
  }

  const toggleBedStatus = (bedId: string, current: BedStatus) => {
    const next: Record<BedStatus, BedStatus> = {
      available: 'reserved',
      reserved: 'maintenance',
      maintenance: 'occupied',
      occupied: 'available',
    }
    const updated = next[current]
    setBedOverrides((prev) => ({ ...prev, [bedId]: updated }))
    toast('info', 'Bed status updated', `Bed ${bedId} changed to ${statusLabel[updated]}.`)
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow={`Administrator console · ${user?.name}`}
        title="Estate control centre"
        sub="Complete administrative command room: real-time KPIs, instant bed status overrides, pending application approvals, fee ledger management, and circular broadcasting."
        right={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setStudentModal(true)}>Add Student</Button>
            <Button variant="ghost" size="sm" icon="download" onClick={handleExportAudit}>Export Audit</Button>
            <Button variant="primary" size="sm" icon="bell" onClick={() => setNoticeModal(true)}>Publish Notice</Button>
          </div>
        }
      />

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <StatCard label="Total hostels" value={stats.totalHostels} icon="building" foot={`${stats.totalBuildings} buildings · ${stats.totalFloors} floors`} />
        <StatCard label="Total rooms" value={stats.totalRooms} icon="grid" foot={`${stats.maintRooms} rooms under maintenance`} />
        <StatCard label="Total beds" value={stats.totalBeds} icon="bed" foot="3-seater and 4-seater mix" />
        <StatCard label="Occupancy" value={`${stats.occupancyPct}%`} tone="info" icon="trending" />
      </div>

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <StatCard label="Occupied beds" value={stats.occupied} tone="warn" icon="users" />
        <StatCard label="Available beds" value={stats.available} tone="ok" icon="check" foot={`${stats.reserved} reserved · ${stats.maintenanceBeds} blocked`} />
        <StatCard label="Pending applications" value={pendingApps.length} tone="info" icon="clipboard" foot={`${applications.length} total requests`} />
        <StatCard label="Pending complaints" value={openComplaints.length} tone="danger" icon="alert" foot={`${complaints.length} tickets logged`} />
      </div>

      {/* ------------------- INTERACTIVE CONTROL PANELS ------------------- */}
      <div className="grid g2" style={{ marginBottom: 26 }}>
        {/* Pending Room Applications Queue */}
        <div className="card pad-lg">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div className="card-title"><Icon name="clipboard" size={17} /> Pending Room Booking Applications</div>
            <span className="chip-tag cyan">{pendingApps.length} Action Required</span>
          </div>
          {pendingApps.length ? (
            <div className="col" style={{ gap: 12 }}>
              {pendingApps.slice(0, 4).map((app) => (
                <div className="card tight" key={app.id} style={{ background: 'var(--bg-3)' }}>
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <b>{app.studentName}</b>
                    <span className="chip-tag violet">{app.roomId}</span>
                  </div>
                  {app.note && <p className="tiny muted" style={{ margin: '0 0 10px' }}>"{app.note}"</p>}
                  <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                    <Button size="xs" variant="ghost" onClick={() => decideApplication(app.id, 'rejected')}>Reject</Button>
                    <Button size="xs" variant="outline" onClick={() => decideApplication(app.id, 'waitlisted')}>Waitlist</Button>
                    <Button size="xs" variant="primary" icon="check" onClick={() => decideApplication(app.id, 'approved')}>Approve</Button>
                  </div>
                </div>
              ))}
              {pendingApps.length > 4 && <Button variant="ghost" size="sm" onClick={() => setSection('applications')}>View all {pendingApps.length} applications →</Button>}
            </div>
          ) : (
            <EmptyState icon="check" title="All caught up!" message="No pending room applications waiting for approval." />
          )}
        </div>

        {/* Financial & Complaint Quick Actions */}
        <div className="col" style={{ gap: 18 }}>
          {/* Revenue Health */}
          <div className="card pad-lg">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="card-title"><Icon name="wallet" size={17} /> Revenue & Fee Collection</div>
              <span className="chip-tag violet">{collectionPct}% Collected</span>
            </div>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="tiny muted">Collected This Term</div>
                <b style={{ fontSize: '1.3rem', color: 'var(--ok)' }}>{rupee(feeCollected)}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tiny muted">Pending Dues</div>
                <b style={{ fontSize: '1.3rem', color: 'var(--danger)' }}>{rupee(feePending)}</b>
              </div>
            </div>
            <div style={{ height: 8, width: '100%', background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${collectionPct}%`, background: 'var(--grad)', borderRadius: 999 }} />
            </div>
            <Button variant="ghost" size="sm" icon="bell" block onClick={handleSendReminders}>Send Payment Reminders to Outstanding Accounts</Button>
          </div>

          {/* Urgent Complaints Escalation */}
          <div className="card pad-lg">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="card-title"><Icon name="alert" size={17} /> Urgent Unresolved Tickets</div>
              <span className="chip-tag danger">{openComplaints.length} Open</span>
            </div>
            {openComplaints.length ? (
              <div className="col" style={{ gap: 10 }}>
                {openComplaints.slice(0, 2).map((c) => (
                  <div className="row-between" key={c.id} style={{ padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 'var(--r-xs)' }}>
                    <div>
                      <b className="small">{c.ticket} · {c.category}</b>
                      <div className="tiny muted">Room {c.roomNumber} · Raised by {c.raisedBy}</div>
                    </div>
                    <Button size="xs" variant="primary" onClick={() => setComplaintStatus(c.id, 'resolved', 'Admin Console', 'Resolved from dashboard')}>Resolve</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tiny muted">No unresolved tickets right now.</div>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------- Management --------------------------- */}
      <div className="card pad-lg">
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}><Icon name="layers" size={17} /> Estate Management Console</div>
          <div className="search" style={{ minWidth: 260 }}>
            <input
              className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records in active section…" aria-label="Search management records"
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
            <table className="table">
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
                    <td><Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Hostel Record', `${h.name} details loaded.`)}>Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Buildings */}
        {section === 'buildings' && (
          <div className="table-wrap">
            <table className="table">
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
                    <td><Button size="xs" variant="ghost" icon="refresh" onClick={() => toast('info', 'Building Record', `${b.name} block details loaded.`)}>Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Floors */}
        {section === 'floors' && (
          <div className="table-wrap">
            <table className="table">
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
                          <span className="tiny muted">{bs.length ? Math.round((occ / bs.length) * 100) : 0}% Occupied</span>
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
            <table className="table">
              <thead><tr><th>Room</th><th>Block</th><th>Floor</th><th>Type</th><th>Seater</th><th>Free / Total</th><th>Monthly</th><th>Semester</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {ROOMS.filter((r) => !q || `${r.number} ${r.type} ${getBuilding(r.buildingId)?.code}`.toLowerCase().includes(q)).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.number}</b></td>
                    <td>{getBuilding(r.buildingId)?.code}</td>
                    <td>{floorName(r.floor)}</td>
                    <td>{r.type}</td>
                    <td>{r.seater}-seater</td>
                    <td><b>{bedCounts(r).available}</b> / {bedCounts(r).total}</td>
                    <td>{rupee(r.monthlyFee)}</td>
                    <td>{rupee(r.semesterFee)}</td>
                    <td><StatusBadge status={roomStatus(r)} /></td>
                    <td><Button size="xs" variant="ghost" onClick={() => navigate('/rooms')}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Beds Matrix with Quick Status Override */}
        {section === 'beds' && (
          <div>
            <p className="tiny muted" style={{ marginBottom: 12 }}>
              <Icon name="info" size={13} /> Click any bed status button to instantly cycle status (Available $\rightarrow$ Reserved $\rightarrow$ Maintenance $\rightarrow$ Occupied).
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Bed ID</th><th>Room</th><th>Label</th><th>Status Override</th><th>Student ID</th><th>Action</th></tr></thead>
                <tbody>
                  {beds.filter((b) => !q || `${b.id} ${b.label} ${b.room.number} ${b.status}`.toLowerCase().includes(q)).slice(0, 40).map((b) => (
                    <tr key={b.id}>
                      <td className="mono tiny">{b.id}</td>
                      <td><b>{b.room.number}</b></td>
                      <td>{b.label}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td className="mono tiny">{b.studentId ?? '—'}</td>
                      <td>
                        <Button size="xs" variant="ghost" icon="refresh" onClick={() => toggleBedStatus(b.id, b.status)}>
                          Cycle Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students */}
        {section === 'students' && (
          <div>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">Active Enrolled Residents ({students.length})</span>
              <Button size="sm" variant="primary" icon="plus" onClick={() => setStudentModal(true)}>Enroll New Student</Button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Student</th><th>Roll No</th><th>Course / Year</th><th>Room</th><th>Bed</th><th>Phone</th><th>Guardian</th><th>Fee Dues</th><th>Action</th></tr></thead>
                <tbody>
                  {students.filter((s) => !q || `${s.name} ${s.rollNo} ${s.course}`.toLowerCase().includes(q)).map((s) => {
                    const pending = Math.max(0, (s.feeTotal || 85000) - (s.feePaid || 0))
                    return (
                      <tr key={s.id}>
                        <td><b>{s.name}</b></td>
                        <td className="mono tiny">{s.rollNo}</td>
                        <td>{s.course} · Year {s.year}</td>
                        <td>{s.roomId ? <b>{s.roomId}</b> : <span className="muted">Unassigned</span>}</td>
                        <td>{s.bedId ?? '—'}</td>
                        <td className="mono tiny">{s.phone}</td>
                        <td className="tiny">{s.guardian} ({s.guardianPhone})</td>
                        <td>
                          {pending > 0 ? (
                            <span className="chip-tag danger">{rupee(pending)} due</span>
                          ) : (
                            <span className="chip-tag cyan">Cleared</span>
                          )}
                        </td>
                        <td>
                          <Button size="xs" variant="danger" icon="trash" onClick={() => handleRemoveStudent(s.id, s.name)}>Remove</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications */}
        {section === 'applications' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>App ID</th><th>Student</th><th>Room</th><th>Status</th><th>Applied Date</th><th>Notes</th><th>Actions</th></tr></thead>
              <tbody>
                {applications.filter((a) => !q || `${a.studentName} ${a.roomId} ${a.status}`.toLowerCase().includes(q)).map((a) => (
                  <tr key={a.id}>
                    <td className="mono tiny">{a.id}</td>
                    <td><b>{a.studentName}</b></td>
                    <td><b>{a.roomId}</b></td>
                    <td><span className={`chip-tag ${a.status === 'approved' ? 'cyan' : a.status === 'rejected' ? 'danger' : 'violet'}`}>{a.status}</span></td>
                    <td className="tiny muted">{a.appliedAt.slice(0, 10)}</td>
                    <td className="tiny dim">{a.note ?? '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Button size="xs" variant="primary" onClick={() => decideApplication(a.id, 'approved')}>Approve</Button>
                        <Button size="xs" variant="ghost" onClick={() => decideApplication(a.id, 'rejected')}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Complaints */}
        {section === 'complaints' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Ticket</th><th>Category</th><th>Room</th><th>Raised By</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {complaints.filter((c) => !q || `${c.ticket} ${c.category} ${c.raisedBy}`.toLowerCase().includes(q)).map((c) => (
                  <tr key={c.id}>
                    <td className="mono tiny"><b>{c.ticket}</b></td>
                    <td>{c.category}</td>
                    <td>{c.roomNumber}</td>
                    <td>{c.raisedBy}</td>
                    <td><span className={`chip-tag ${c.priority === 'high' ? 'danger' : 'violet'}`}>{c.priority}</span></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.status !== 'resolved' ? (
                        <Button size="xs" variant="primary" onClick={() => setComplaintStatus(c.id, 'resolved', 'Admin', 'Resolved by admin console')}>
                          Resolve
                        </Button>
                      ) : <span className="tiny muted">Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mess Menus */}
        {section === 'mess' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snacks</th><th>Dinner</th><th>Timing</th></tr></thead>
              <tbody>
                {MESS_WEEK.map((m) => (
                  <tr key={m.day}>
                    <td><b>{m.day}</b></td>
                    <td className="tiny">{m.meals.find((x) => x.key === 'breakfast')?.items.join(', ') || '—'}</td>
                    <td className="tiny">{m.meals.find((x) => x.key === 'lunch')?.items.join(', ') || '—'}</td>
                    <td className="tiny">{m.meals.find((x) => x.key === 'snacks')?.items.join(', ') || '—'}</td>
                    <td className="tiny">{m.meals.find((x) => x.key === 'dinner')?.items.join(', ') || '—'}</td>
                    <td className="tiny muted">07:30 - 21:30</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments */}
        {section === 'payments' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Receipt</th><th>Student ID</th><th>Term</th><th>Amount</th><th>Date</th><th>Mode</th><th>Status</th></tr></thead>
              <tbody>
                {payments.filter((p) => !q || `${p.receipt} ${p.studentId} ${p.mode}`.toLowerCase().includes(q)).map((p) => (
                  <tr key={p.id}>
                    <td className="mono tiny"><b>{p.receipt}</b></td>
                    <td className="mono tiny">{p.studentId}</td>
                    <td>{p.term}</td>
                    <td><b>{rupee(p.amount)}</b></td>
                    <td className="tiny muted">{p.date}</td>
                    <td>{p.mode}</td>
                    <td><span className="chip-tag cyan">{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transport */}
        {section === 'transport' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Route</th><th>Bus No</th><th>Driver</th><th>Phone</th><th>Pickup Points</th><th>Departure</th><th>Seats</th></tr></thead>
              <tbody>
                {TRANSPORT_ROUTES.map((t) => (
                  <tr key={t.id}>
                    <td><b>{t.route}</b></td>
                    <td className="mono tiny">{t.busNo}</td>
                    <td>{t.driver}</td>
                    <td className="mono tiny">{t.driverPhone}</td>
                    <td className="tiny">{t.stops.map((s) => s.point).join(' → ')}</td>
                    <td className="mono tiny">{t.nextAt}</td>
                    <td><b>{t.seats - t.booked}</b> / {t.seats} free</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notices */}
        {section === 'notices' && (
          <div>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="small muted">Active Circulars ({notices.length})</span>
              <Button size="sm" variant="primary" icon="plus" onClick={() => setNoticeModal(true)}>New Notice</Button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Date</th><th>Pinned</th><th>Action</th></tr></thead>
                <tbody>
                  {notices.filter((n) => !q || `${n.title} ${n.category}`.toLowerCase().includes(q)).map((n) => (
                    <tr key={n.id}>
                      <td><b>{n.title}</b></td>
                      <td><span className="chip-tag violet">{n.category}</span></td>
                      <td className="tiny">{n.by}</td>
                      <td className="tiny muted">{n.date}</td>
                      <td>{n.pinned ? <span className="chip-tag cyan">Pinned</span> : '—'}</td>
                      <td>
                        <Button size="xs" variant="danger" icon="trash" onClick={() => removeNotice(n.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --------------------- BROADCAST NOTICE MODAL --------------------- */}
      <Modal
        open={noticeModal}
        onClose={() => setNoticeModal(false)}
        title="Publish Estate Notice"
        subtitle="Broadcast an official circular to all students and staff dashboards"
      >
        <form onSubmit={handlePostNotice} className="col" style={{ gap: 14 }}>
          <Field label="Notice Title" id="nt-title">
            <input
              id="nt-title" className="input" value={newNotice.title}
              onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
              placeholder="e.g. Annual Hostel Maintenance & Inspection Schedule"
            />
          </Field>
          <Field label="Category" id="nt-cat">
            <select
              id="nt-cat" className="select" value={newNotice.category}
              onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value as any })}
            >
              <option value="General">General</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Mess">Mess</option>
              <option value="Fees">Fees</option>
              <option value="Transport">Transport</option>
              <option value="Event">Event</option>
              <option value="Safety">Safety</option>
              <option value="Event">Events</option>
            </select>
          </Field>
          <Field label="Content / Circular Text" id="nt-content">
            <textarea
              id="nt-content" className="textarea" value={newNotice.content}
              onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
              placeholder="Write the full circular message to be displayed on student and staff noticeboards…"
            />
          </Field>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
            <input
              type="checkbox" checked={newNotice.pinned}
              onChange={(e) => setNewNotice({ ...newNotice, pinned: e.target.checked })}
            />
            <b>Pin to top of Noticeboard</b>
          </label>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <Button type="button" variant="ghost" onClick={() => setNoticeModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon="bell">Broadcast Notice</Button>
          </div>
        </form>
      </Modal>

      {/* --------------------- ENROLL STUDENT MODAL --------------------- */}
      <Modal
        open={studentModal}
        onClose={() => setStudentModal(false)}
        title="Enroll New Resident Student"
        subtitle="Add student profile, academic roll number, room allocation and fee details"
      >
        <form onSubmit={handleAddStudent} className="col" style={{ gap: 14 }}>
          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Full Name" id="st-name">
              <input
                id="st-name" className="input" value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="e.g. Rahul Sharma" required
              />
            </Field>
            <Field label="Roll Number" id="st-roll">
              <input
                id="st-roll" className="input" value={newStudent.rollNo}
                onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                placeholder="e.g. 2026-CSE-108" required
              />
            </Field>
          </div>

          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Email Address" id="st-email">
              <input
                id="st-email" type="email" className="input" value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="rahul@roh.edu.in"
              />
            </Field>
            <Field label="Phone Number" id="st-phone">
              <input
                id="st-phone" className="input" value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder="+91 98765 43210" required
              />
            </Field>
          </div>

          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Course & Branch" id="st-course">
              <input
                id="st-course" className="input" value={newStudent.course}
                onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                placeholder="B.Tech Computer Science"
              />
            </Field>
            <Field label="Academic Year" id="st-year">
              <select
                id="st-year" className="select" value={newStudent.year}
                onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
              >
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
              </select>
            </Field>
          </div>

          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Allocated Room" id="st-room">
              <input
                id="st-room" className="input" value={newStudent.roomId}
                onChange={(e) => setNewStudent({ ...newStudent, roomId: e.target.value })}
                placeholder="ARV-101"
              />
            </Field>
            <Field label="Bed ID" id="st-bed">
              <input
                id="st-bed" className="input" value={newStudent.bedId}
                onChange={(e) => setNewStudent({ ...newStudent, bedId: e.target.value })}
                placeholder="ARV-101-B1"
              />
            </Field>
          </div>

          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Guardian Name" id="st-gname">
              <input
                id="st-gname" className="input" value={newStudent.guardian}
                onChange={(e) => setNewStudent({ ...newStudent, guardian: e.target.value })}
                placeholder="Suresh Sharma"
              />
            </Field>
            <Field label="Guardian Phone" id="st-gphone">
              <input
                id="st-gphone" className="input" value={newStudent.guardianPhone}
                onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                placeholder="+91 98110 55443"
              />
            </Field>
          </div>

          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Total Hostel Fee (₹)" id="st-feetotal">
              <input
                id="st-feetotal" type="number" className="input" value={newStudent.feeTotal}
                onChange={(e) => setNewStudent({ ...newStudent, feeTotal: Number(e.target.value) })}
              />
            </Field>
            <Field label="Initial Fee Paid (₹)" id="st-feepaid">
              <input
                id="st-feepaid" type="number" className="input" value={newStudent.feePaid}
                onChange={(e) => setNewStudent({ ...newStudent, feePaid: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <Button type="button" variant="ghost" onClick={() => setStudentModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon="plus">Enroll Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
