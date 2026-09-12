import React, { useState } from 'react'
import {
  ROOMS, STUDENTS, bedCounts, floorName, getBuilding, getHostel, roomStatus, rupee,
} from '../data/mock'
import { Icon } from '../lib/icons'
import { Link, useMatch } from '../lib/router'
import { Button, EmptyState, KV, LinkButton, PrivacyNote, SectionHead, StatusBadge, Tag } from '../lib/ui'
import { BedLayout, CompareTray, RoomDetail } from '../components/RoomDetail'
import { useApp } from '../lib/store'

export function RoomDetails() {
  const params = useMatch('/rooms/:id')
  const { user, applyForRoom, isShortlisted, toggleShortlist, toggleCompare, compare, toast } = useApp()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const room = ROOMS.find((r) => r.id === decodeURIComponent(params?.id ?? ''))

  if (!room) {
    return (
      <div className="page-enter wrap section">
        <EmptyState
          icon="search"
          title="Room not found"
          message="That room number does not exist in the demo dataset. Try browsing all rooms across the three blocks."
          action={<LinkButton to="/rooms" variant="primary" icon="bed">Explore all rooms</LinkButton>}
        />
      </div>
    )
  }

  const building = getBuilding(room.buildingId)
  const hostel = getHostel(room.hostelId)
  const counts = bedCounts(room)
  const status = roomStatus(room)
  const short = isShortlisted(room.id)
  const canApply = counts.available > 0 && status !== 'maintenance'
  const roommates = STUDENTS.filter((s) => s.roomId === room.id)
  const related = ROOMS.filter((r) => r.buildingId === room.buildingId && r.id !== room.id).slice(0, 3)

  const handleApply = () => {
    if (!user) { setError('Sign in with a demo student account to apply for this room.'); toast('warn', 'Sign in required', 'Open the login page and pick the student demo account.'); return }
    if (user.role !== 'student') { setError(`Applications are submitted from a student account. You are signed in as ${user.role}.`); return }
    setError('')
    applyForRoom(room, note.trim() || undefined)
    setNote('')
  }

  return (
    <div className="page-enter wrap section">
      <div className="row small muted" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/">Home</Link> <Icon name="chevronRight" size={13} />
        <Link to="/rooms">Explore Rooms</Link> <Icon name="chevronRight" size={13} />
        <span style={{ color: 'var(--text)' }}>{room.number}</span>
      </div>

      <SectionHead
        eyebrow={`${hostel?.name} · ${building?.name}`}
        title={`Room ${room.number}`}
        sub={`${floorName(room.floor)} · ${room.type} · ${room.seater}-seater · ${counts.available} of ${counts.total} beds available`}
        right={<StatusBadge status={status} />}
      />

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div className="card tight"><div className="tiny muted">Monthly fee</div><div className="fee-m">{rupee(room.monthlyFee)}</div></div>
        <div className="card tight"><div className="tiny muted">Semester fee</div><div className="fee-m">{rupee(room.semesterFee)}</div></div>
        <div className="card tight"><div className="tiny muted">Security deposit</div><div className="fee-m">{rupee(room.securityDeposit)}</div></div>
        <div className="card tight"><div className="tiny muted">Available beds</div><div className="fee-m" style={{ color: 'var(--ok)' }}>{counts.available}</div></div>
      </div>

      <div className="split-wide" style={{ marginBottom: 26 }}>
        <div className="col" style={{ gap: 20 }}>
          <div className="card pad-lg">
            <div className="card-title" style={{ marginBottom: 14 }}><Icon name="bed" size={17} /> Bed layout</div>
            <BedLayout room={room} />
          </div>

          <div className="grid g2" style={{ gap: 20 }}>
            <div className="card pad-lg">
              <div className="card-title" style={{ marginBottom: 14 }}><Icon name="building" size={17} /> Room particulars</div>
              <KV rows={[
                ['Room number', room.number],
                ['Hostel', hostel?.name ?? '—'],
                ['Building / block', building?.name ?? '—'],
                ['Floor', floorName(room.floor)],
                ['Air conditioning', room.type],
                ['Capacity', `${room.seater}-seater`],
                ['Total beds', String(counts.total)],
                ['Occupied beds', String(counts.occupied)],
                ['Available beds', <b style={{ color: 'var(--ok)' }}>{counts.available}</b>],
                ['Reserved beds', String(counts.reserved)],
                ['Under maintenance', String(counts.maintenance)],
                ['Room status', <StatusBadge status={status} />],
              ]} />
            </div>

            <div className="card pad-lg">
              <div className="card-title" style={{ marginBottom: 14 }}><Icon name="sparkle" size={17} /> Facilities</div>
              <div className="fac-list">{room.facilities.map((f) => <Tag key={f} tone={f === 'Air Conditioning' ? 'cyan' : undefined}>{f}</Tag>)}</div>
              <div className="divider" />
              <div className="card-title" style={{ marginBottom: 12, fontSize: '0.9rem' }}><Icon name="users" size={15} /> Roommates</div>
              {roommates.length === 0 ? (
                <span className="small muted">No residents allotted yet — this room would be entirely yours.</span>
              ) : (
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  {roommates.map((s) => (
                    <span key={s.id} className="chip-tag">
                      <Icon name="lock" size={11} />
                      {user?.role === 'admin' || user?.role === 'warden' || user?.studentId === s.id ? s.name : 'Resident (private)'}
                    </span>
                  ))}
                </div>
              )}
              <p className="tiny dim" style={{ marginTop: 12, marginBottom: 0 }}>
                Occupant names, courses and academic years are withheld from public view.
              </p>
            </div>
          </div>
        </div>

        <aside className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}><Icon name="plus" size={16} /> Apply for this room</div>
            <div className="col" style={{ gap: 12 }}>
              <textarea
                className="textarea" style={{ minHeight: 88 }} value={note} maxLength={220}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note to the warden (preferences, medical needs, etc.)"
                aria-label="Note to warden"
              />
              {error && <p className="tiny" style={{ color: 'var(--danger)', margin: 0 }} role="alert">{error}</p>}
              <Button variant="primary" icon="check" block disabled={!canApply} onClick={handleApply}>
                {canApply ? 'Submit application' : 'No beds available'}
              </Button>
              <div className="grid g2" style={{ gap: 10 }}>
                <Button variant={short ? 'pink' : 'ghost'} icon="heart" size="sm" onClick={() => toggleShortlist(room.id)}>
                  {short ? 'Shortlisted' : 'Shortlist'}
                </Button>
                <Button variant={compare.includes(room.id) ? 'outline' : 'ghost'} icon="scale" size="sm" onClick={() => toggleCompare(room.id)}>
                  {compare.includes(room.id) ? 'In compare' : 'Compare'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" icon="eye" block onClick={() => setOpen(true)}>Open quick-view panel</Button>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}><Icon name="layers" size={16} /> More rooms in this block</div>
            <div className="col" style={{ gap: 10 }}>
              {related.map((r) => (
                <Link key={r.id} to={`/rooms/${r.id}`} className="card tight hoverable" style={{ color: 'inherit' }}>
                  <div className="row-between">
                    <b>{r.number}</b>
                    <StatusBadge status={roomStatus(r)} />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 5 }}>
                    {r.type} · {r.seater}-seater · {bedCounts(r).available} free · {rupee(r.monthlyFee)}/mo
                  </div>
                </Link>
              ))}
              <LinkButton to="/map" variant="ghost" size="sm" icon="layers" block>See it on the 3D map</LinkButton>
            </div>
          </div>
        </aside>
      </div>

      <PrivacyNote />
      <RoomDetail room={room} open={open} onClose={() => setOpen(false)} />
      <CompareTray />
    </div>
  )
}
