import React, { useState } from 'react'
import {
  ROOMS, STUDENTS, Room, bedCounts, floorName, getBuilding, getHostel, roomStatus, rupee,
} from '../data/mock'
import { Icon } from '../lib/icons'
import { BedBadge, Button, Field, KV, Modal, PrivacyNote, StatusBadge, Tag } from '../lib/ui'
import { canViewPrivateDetails, canViewRoommates, useApp } from '../lib/store'

export const findRoom = (id: string) => ROOMS.find((r) => r.id === id)

/* =========================================================================
   Bed layout — publicly shows STATUS ONLY. Occupant identity is gated behind
   role permissions (see canViewPrivateDetails in lib/store.tsx).
   ========================================================================= */
export function BedLayout({ room }: { room: Room }) {
  const { user } = useApp()
  const counts = bedCounts(room)

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <b className="small" style={{ letterSpacing: '0.02em' }}>Bed Layout · {counts.total} beds</b>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="chip-tag" style={{ color: 'var(--ok)' }}>{counts.available} available</span>
          <span className="chip-tag" style={{ color: 'var(--danger)' }}>{counts.occupied} occupied</span>
          {counts.reserved > 0 && <span className="chip-tag" style={{ color: 'var(--info)' }}>{counts.reserved} reserved</span>}
          {counts.maintenance > 0 && <span className="chip-tag" style={{ color: 'var(--grey)' }}>{counts.maintenance} maintenance</span>}
        </div>
      </div>

      <div className="bed-grid">
        {room.beds.map((bed) => {
          const occupant = STUDENTS.find((s) => s.id === bed.studentId)
          const reveal = canViewPrivateDetails(user, bed.studentId)
          return (
            <div
              key={bed.id}
              className={`bed ${bed.status}`}
              title={reveal && occupant ? `${occupant.name} · ${occupant.course}` : 'Occupant details are private'}
            >
              <div className="row-between" style={{ marginBottom: 6 }}>
                <b>{bed.label}</b>
                {bed.status === 'occupied' && !reveal && (
                  <span className="bed-lock" title="Occupant identity is private"><Icon name="lock" size={13} /></span>
                )}
              </div>
              <BedBadge status={bed.status} />
              <div className="tiny dim" style={{ marginTop: 7 }}>
                {reveal && occupant
                  ? occupant.name
                  : bed.status === 'available' ? 'Open for allocation'
                    : bed.status === 'reserved' ? 'Held for quota'
                      : bed.status === 'maintenance' ? 'Temporarily blocked'
                        : 'Occupant withheld'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================================================
   Room detail dialog — opened from cards, the 3D map and dashboard tables.
   ========================================================================= */
export function RoomDetail({
  room, open, onClose, onApplied,
}: { room: Room | null; open: boolean; onClose: () => void; onApplied?: () => void }) {
  const { user, isShortlisted, toggleShortlist, toggleCompare, compare, applyForRoom, toast } = useApp()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!room) return null

  const building = getBuilding(room.buildingId)
  const hostel = getHostel(room.hostelId)
  const counts = bedCounts(room)
  const status = roomStatus(room)
  const short = isShortlisted(room.id)
  const inCompare = compare.includes(room.id)
  const canApply = counts.available > 0 && status !== 'maintenance'
  const roommates = STUDENTS.filter((s) => s.roomId === room.id && s.bedId !== undefined)
  const canSeeRoommates = canViewRoommates(user, room.id)

  const handleApply = () => {
    if (!user) {
      setError('Please sign in with a demo account before applying for a room.')
      toast('warn', 'Sign in required', 'Use the Login page and pick a demo role to submit a room application.')
      return
    }
    if (user.role !== 'student') {
      setError(`Room applications can only be submitted from a student account. You are signed in as ${user.role}.`)
      toast('warn', 'Student account required', 'Switch to student@roh.demo to apply for a room.')
      return
    }
    setError('')
    applyForRoom(room, note.trim() || undefined)
    setNote('')
    onApplied?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="room-detail-title"
      title={<span className="row" style={{ gap: 10 }}>Room {room.number} <StatusBadge status={status} /></span>}
      subtitle={`${hostel?.name} · ${building?.name} · ${floorName(room.floor)}`}
      footer={
        <>
          <Button variant="ghost" icon="scale" onClick={() => toggleCompare(room.id)}>
            {inCompare ? 'In compare list' : 'Compare Room'}
          </Button>
          <Button variant={short ? 'pink' : 'ghost'} icon="heart" onClick={() => toggleShortlist(room.id)}>
            {short ? 'Shortlisted' : 'Shortlist Room'}
          </Button>
          <Button
            variant="primary" icon="plus" disabled={!canApply} onClick={handleApply}
            title={canApply ? 'Apply for this room' : 'No beds available in this room'}
          >
            {canApply ? 'Apply for Room' : 'No beds available'}
          </Button>
        </>
      }
    >
      <div className="grid g-auto-220" style={{ marginBottom: 20 }}>
        <div className="card tight">
          <div className="tiny muted">Monthly Fee</div>
          <div className="fee-m">{rupee(room.monthlyFee)}</div>
        </div>
        <div className="card tight">
          <div className="tiny muted">Semester Fee (6 months)</div>
          <div className="fee-m">{rupee(room.semesterFee)}</div>
        </div>
        <div className="card tight">
          <div className="tiny muted">Security Deposit (refundable)</div>
          <div className="fee-m">{rupee(room.securityDeposit)}</div>
        </div>
      </div>

      <div className="grid g2" style={{ gap: 18, marginBottom: 20 }}>
        <div className="card tight">
          <div className="card-title" style={{ marginBottom: 12 }}><Icon name="building" size={16} /> Room particulars</div>
          <KV rows={[
            ['Room number', room.number],
            ['Hostel', hostel?.name ?? '—'],
            ['Building / Block', `${building?.name} (${building?.code})`],
            ['Floor', floorName(room.floor)],
            ['Air conditioning', room.type],
            ['Capacity', `${room.seater}-seater`],
            ['Total beds', String(counts.total)],
            ['Occupied beds', String(counts.occupied)],
            ['Available beds', <b style={{ color: 'var(--ok)' }}>{counts.available}</b>],
            ['Reserved beds', String(counts.reserved)],
            ['Room status', <StatusBadge status={status} />],
          ]} />
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card tight">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="sparkle" size={16} /> Facilities</div>
            <div className="fac-list">
              {room.facilities.map((f) => <Tag key={f} tone={f === 'Air Conditioning' ? 'cyan' : undefined}>{f}</Tag>)}
            </div>
            {room.reservedFor && (
              <p className="tiny muted" style={{ marginTop: 12, marginBottom: 0 }}>
                <Icon name="info" size={13} style={{ verticalAlign: '-2px' }} /> {room.reservedFor}
              </p>
            )}
            {room.maintenanceNote && (
              <p className="tiny" style={{ color: 'var(--warn)', marginTop: 8, marginBottom: 0 }}>
                <Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {room.maintenanceNote}
              </p>
            )}
          </div>

          <div className="card tight">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="users" size={16} /> Roommate information</div>
            {canSeeRoommates ? (
              roommates.length ? (
                <div className="col" style={{ gap: 10 }}>
                  {roommates.map((s) => (
                    <div className="row" key={s.id} style={{ gap: 10 }}>
                      <span className="avatar" style={{ width: 32, height: 32, fontSize: '0.72rem' }}>{s.avatar}</span>
                      <div>
                        <b className="small">{s.name}</b>
                        <div className="tiny muted">
                          {canViewPrivateDetails(user, s.id) ? `${s.course} · ${s.year} · ${s.rollNo}` : 'Co-resident in your room'}
                        </div>
                      </div>
                    </div>
                  ))}
                  <span className="tiny dim">Shown because you are a verified resident of this room.</span>
                </div>
              ) : <span className="small muted">No residents are currently allotted to this room.</span>
            ) : (
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--muted)', flex: 'none', marginTop: 2 }}><Icon name="lock" size={18} /></span>
                <span className="small muted" style={{ margin: 0 }}>
                  Resident identities are hidden in visitor mode. Sign in as the assigned student, warden or
                  administrator to view permitted roommate details.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card tight" style={{ marginBottom: 18 }}>
        <BedLayout room={room} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <Field label="Note to warden (optional — appears on your application)" id="apply-note">
          <textarea
            className="textarea" id="apply-note" value={note} maxLength={220}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Prefer a lower-floor AC room close to the reading hall. I have a documented medical requirement."
          />
        </Field>
        {error && <p className="small" style={{ color: 'var(--danger)', marginTop: 8, marginBottom: 0 }} role="alert">{error}</p>}
        <p className="tiny dim" style={{ marginTop: 8, marginBottom: 0 }}>
          Demo mode: applications are stored locally and appear instantly in the warden and admin dashboards.
        </p>
      </div>

      <PrivacyNote compact />
    </Modal>
  )
}

/* =========================================================================
   Compare tray (max 3 rooms) + side-by-side comparison dialog
   ========================================================================= */
export function CompareTray() {
  const { compare, clearCompare, toggleCompare } = useApp()
  const [open, setOpen] = useState(false)
  if (!compare.length) return null
  const rooms = compare.map(findRoom).filter(Boolean) as Room[]

  return (
    <>
      <div className="compare-bar" role="region" aria-label="Room comparison tray">
        <Icon name="scale" size={18} />
        <span className="small"><b>{compare.length}</b> selected</span>
        <div className="row hide-sm" style={{ gap: 6 }}>
          {rooms.map((r) => <span key={r.id} className="chip-tag cyan">{r.number}</span>)}
        </div>
        <Button variant="ghost" size="xs" onClick={clearCompare}>Clear</Button>
        <Button variant="primary" size="sm" icon="scale" disabled={rooms.length < 2} onClick={() => setOpen(true)}>
          Compare
        </Button>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)}
        title="Room comparison" subtitle={`${rooms.length} rooms side by side`}
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Attribute</th>
                {rooms.map((r) => <th key={r.id}>{r.number}</th>)}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Building" rooms={rooms} render={(r) => getBuilding(r.buildingId)?.name ?? '—'} />
              <CompareRow label="Floor" rooms={rooms} render={(r) => floorName(r.floor)} />
              <CompareRow label="AC / Non-AC" rooms={rooms} render={(r) => r.type} />
              <CompareRow label="Seater" rooms={rooms} render={(r) => `${r.seater}-seater`} />
              <CompareRow label="Total beds" rooms={rooms} render={(r) => String(bedCounts(r).total)} />
              <CompareRow label="Available beds" rooms={rooms} render={(r) => <b style={{ color: 'var(--ok)' }}>{bedCounts(r).available}</b>} />
              <CompareRow label="Occupancy" rooms={rooms} render={(r) => `${Math.round((bedCounts(r).occupied / bedCounts(r).total) * 100)}%`} />
              <CompareRow label="Monthly fee" rooms={rooms} render={(r) => rupee(r.monthlyFee)} />
              <CompareRow label="Semester fee" rooms={rooms} render={(r) => rupee(r.semesterFee)} />
              <CompareRow label="Security deposit" rooms={rooms} render={(r) => rupee(r.securityDeposit)} />
              <CompareRow label="Facilities" rooms={rooms} render={(r) => r.facilities.join(' · ')} />
              <CompareRow label="Status" rooms={rooms} render={(r) => <StatusBadge status={roomStatus(r)} />} />
            </tbody>
          </table>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {rooms.map((r) => (
            <Button key={r.id} variant="ghost" size="sm" icon="x" onClick={() => toggleCompare(r.id)}>Remove {r.number}</Button>
          ))}
        </div>
      </Modal>
    </>
  )
}

function CompareRow({ label, rooms, render }: { label: string; rooms: Room[]; render: (r: Room) => React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</td>
      {rooms.map((r) => <td key={r.id}>{render(r)}</td>)}
    </tr>
  )
}
