import React from 'react'
import { Room, bedCounts, floorName, getBuilding, hostelStats, roomStatus, rupee } from '../data/mock'
import { Icon } from '../lib/icons'
import { StatusBadge, Tag } from '../lib/ui'
import { useApp } from '../lib/store'

export function RoomCard({
  room, view = 'grid', onOpen, index = 0,
}: { room: Room; view?: 'grid' | 'list'; onOpen: (room: Room) => void; index?: number }) {
  const { isShortlisted, toggleShortlist, toggleCompare, compare } = useApp()
  const building = getBuilding(room.buildingId)
  const counts = bedCounts(room)
  const status = roomStatus(room)
  const short = isShortlisted(room.id)
  const inCompare = compare.includes(room.id)

  return (
    <article
      className="card hoverable room-card anim-up"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      aria-labelledby={`room-${room.id}-title`}
    >
      <div className="rc-top">
        <div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <h3 className="room-no" id={`room-${room.id}-title`} style={{ margin: 0 }}>{room.number}</h3>
            <StatusBadge status={status} />
          </div>
          <div className="small muted" style={{ marginTop: 5 }}>
            {building?.name} · {room.hostelId === 'H1' ? 'Aryabhatta Boys Hostel' : 'Kalpana Girls Hostel'} · {floorName(room.floor)}
          </div>
        </div>
        <button
          className="btn btn-icon btn-ghost"
          onClick={() => toggleShortlist(room.id)}
          aria-pressed={short}
          aria-label={short ? `Remove room ${room.number} from shortlist` : `Shortlist room ${room.number}`}
          title={short ? 'Remove from shortlist' : 'Shortlist room'}
          style={short ? { color: '#fb7185', borderColor: 'rgba(251,113,133,0.5)' } : undefined}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>

      <div className="rc-body col" style={{ gap: 12 }}>
        <div className="room-meta">
          <Tag tone={room.type === 'AC' ? 'cyan' : 'violet'}>
            <Icon name="snow" size={12} /> {room.type}
          </Tag>
          <Tag tone="blue"><Icon name="users" size={12} /> {room.seater}-Seater</Tag>
          <Tag><Icon name="layers" size={12} /> {floorName(room.floor)}</Tag>
        </div>

        <div className="rc-specs">
          <div className="spec"><b>{counts.total}</b><span>Beds</span></div>
          <div className="spec"><b style={{ color: 'var(--danger)' }}>{counts.occupied}</b><span>Occupied</span></div>
          <div className="spec"><b style={{ color: 'var(--ok)' }}>{counts.available}</b><span>Available</span></div>
        </div>

        <div className="fac-list">
          {room.facilities.slice(0, 3).map((f) => <span key={f} className="chip-tag">{f}</span>)}
          {room.facilities.length > 3 && <span className="chip-tag">+{room.facilities.length - 3} more</span>}
        </div>
      </div>

      <div className="fee-row">
        <div>
          <div className="fee-m">{rupee(room.monthlyFee)}<span className="fee-s"> /month</span></div>
          <div className="fee-s">Semester: {rupee(room.semesterFee)} · Deposit {rupee(room.securityDeposit)}</div>
        </div>
      </div>

      <div className="rc-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onOpen(room)}>
          <Icon name="eye" size={15} /> View Details
        </button>
        <button
          className={`btn btn-sm btn-ghost ${inCompare ? 'active' : ''}`}
          onClick={() => toggleCompare(room.id)}
          aria-pressed={inCompare}
          title="Add to comparison"
          aria-label={`Compare room ${room.number}`}
        >
          <Icon name="scale" size={15} />
        </button>
        <button
          className={`btn btn-sm ${short ? 'btn-pink' : 'btn-ghost'}`}
          onClick={() => toggleShortlist(room.id)}
          aria-pressed={short}
          aria-label={short ? 'Shortlisted' : 'Shortlist room'}
        >
          <Icon name="heart" size={15} /> <span className="hide-sm">{short ? 'Shortlisted' : 'Shortlist'}</span>
        </button>
      </div>
    </article>
  )
}

/** Compact room row used inside the warden/admin tables and shortlist panel. */
export function RoomMini({ room, onOpen }: { room: Room; onOpen: (r: Room) => void }) {
  const counts = bedCounts(room)
  return (
    <button className="card tight hoverable" style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }} onClick={() => onOpen(room)}>
      <div className="row-between">
        <b>{room.number}</b>
        <StatusBadge status={roomStatus(room)} />
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        {room.type} · {room.seater}-seater · {counts.available}/{counts.total} free · {rupee(room.monthlyFee)}/mo
      </div>
    </button>
  )
}

export const TOTAL_ROOMS = hostelStats().totalRooms
