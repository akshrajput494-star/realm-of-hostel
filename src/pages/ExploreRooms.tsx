import React, { useEffect, useMemo, useState } from 'react'
import {
  ALL_FACILITIES, BUILDINGS, FLOORS, Room, RoomStatus, RoomType, SeaterType,
  bedCounts, floorName, getBuilding, roomStatus, rupee,
} from '../data/mock'
import { api } from '../lib/api'
import { Icon } from '../lib/icons'
import { useRouter } from '../lib/router'
import { Button, EmptyState, Field, SectionHead, SkeletonGrid, StatusBadge, Tabs } from '../lib/ui'
import { RoomCard } from '../components/RoomCard'
import { CompareTray, RoomDetail } from '../components/RoomDetail'
import { useApp } from '../lib/store'

const ALL_STATUSES: RoomStatus[] = ['available', 'partial', 'full', 'reserved', 'maintenance']
const SORTS = [
  { id: 'fee-asc', label: 'Lowest fee first' },
  { id: 'beds-desc', label: 'Highest availability' },
  { id: 'number-asc', label: 'Room number (A → Z)' },
  { id: 'floor-asc', label: 'Floor (low → high)' },
] as const
type SortId = typeof SORTS[number]['id']

export function ExploreRooms() {
  const { query } = useRouter()
  const { shortlist } = useApp()

  const [search, setSearch] = useState('')
  const [types, setTypes] = useState<RoomType[]>(() => {
    const t = query.get('type')
    return t === 'AC' || t === 'Non-AC' ? [t] : []
  })
  const [seaters, setSeaters] = useState<SeaterType[]>(() => {
    const s = Number(query.get('seater'))
    return s === 3 || s === 4 ? [s as SeaterType] : []
  })
  const [floors, setFloors] = useState<number[]>([])
  const [buildings, setBuildings] = useState<string[]>([])
  const [statuses, setStatuses] = useState<RoomStatus[]>([])
  const [facilities, setFacilities] = useState<string[]>([])
  const [maxFee, setMaxFee] = useState(10000)
  const [minBeds, setMinBeds] = useState(0)
  const [sort, setSort] = useState<SortId>('beds-desc')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [onlyShortlist, setOnlyShortlist] = useState(false)

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Room | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Data comes through the API layer so swapping in a real backend is a one-line change.
  useEffect(() => {
    let live = true
    api.rooms.list()
      .then((rows) => { if (live) { setRooms(rows); setLoading(false) } })
      .catch(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rooms.filter((r) => {
      const building = getBuilding(r.buildingId)
      if (q) {
        const haystack = `${r.number} ${r.id} ${r.type} ${r.seater}-seater ${building?.name} ${building?.code} ${r.facilities.join(' ')} ${floorName(r.floor)}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (types.length && !types.includes(r.type)) return false
      if (seaters.length && !seaters.includes(r.seater)) return false
      if (floors.length && !floors.includes(r.floor)) return false
      if (buildings.length && !buildings.includes(r.buildingId)) return false
      if (statuses.length && !statuses.includes(roomStatus(r))) return false
      if (facilities.length && !facilities.every((f) => r.facilities.includes(f))) return false
      if (r.monthlyFee > maxFee) return false
      if (bedCounts(r).available < minBeds) return false
      if (onlyShortlist && !shortlist.includes(r.id)) return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'fee-asc': return a.monthlyFee - b.monthlyFee || a.number.localeCompare(b.number)
        case 'beds-desc': return bedCounts(b).available - bedCounts(a).available || a.number.localeCompare(b.number)
        case 'number-asc': return a.number.localeCompare(b.number)
        case 'floor-asc': return a.floor - b.floor || a.number.localeCompare(b.number)
        default: return 0
      }
    })
    return list
  }, [rooms, search, types, seaters, floors, buildings, statuses, facilities, maxFee, minBeds, sort, onlyShortlist, shortlist])

  const activeCount = types.length + seaters.length + floors.length + buildings.length + statuses.length
    + facilities.length + (maxFee < 10000 ? 1 : 0) + (minBeds > 0 ? 1 : 0) + (onlyShortlist ? 1 : 0)

  const clearAll = () => {
    setTypes([]); setSeaters([]); setFloors([]); setBuildings([]); setStatuses([])
    setFacilities([]); setMaxFee(10000); setMinBeds(0); setOnlyShortlist(false); setSearch('')
  }

  const openRoom = (room: Room) => { setDetail(room); setDetailOpen(true) }

  const FilterPanel = (
    <div className="card" style={{ position: 'relative' }}>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <b className="row" style={{ gap: 8 }}><Icon name="filter" size={16} /> Filters</b>
        {activeCount > 0 && <button className="link-btn tiny" onClick={clearAll}>Clear all ({activeCount})</button>}
      </div>

      <div className="col" style={{ gap: 20 }}>
        <div className="field">
          <label>Air conditioning</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(['AC', 'Non-AC'] as RoomType[]).map((t) => (
              <button key={t} className={`chip ${types.includes(t) ? 'on' : ''}`} aria-pressed={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
                {t === 'AC' && <Icon name="snow" size={12} />} {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Capacity</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {([3, 4] as SeaterType[]).map((s) => (
              <button key={s} className={`chip ${seaters.includes(s) ? 'on' : ''}`} aria-pressed={seaters.includes(s)} onClick={() => toggle(seaters, setSeaters, s)}>
                {s}-Seater
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Building / block</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {BUILDINGS.map((b) => (
              <button key={b.id} className={`chip ${buildings.includes(b.id) ? 'on' : ''}`} aria-pressed={buildings.includes(b.id)} onClick={() => toggle(buildings, setBuildings, b.id)}>
                {b.code} · {b.name.replace(' Block', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Floor</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {FLOORS.map((f) => (
              <button key={f} className={`chip ${floors.includes(f) ? 'on' : ''}`} aria-pressed={floors.includes(f)} onClick={() => toggle(floors, setFloors, f)}>
                {floorName(f)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Room status</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {ALL_STATUSES.map((s) => (
              <button key={s} className={`chip ${statuses.includes(s) ? 'on' : ''}`} aria-pressed={statuses.includes(s)} onClick={() => toggle(statuses, setStatuses, s)}>
                {s === 'available' ? 'Available' : s === 'partial' ? 'Partial' : s === 'full' ? 'Full' : s === 'reserved' ? 'Reserved' : 'Maintenance'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="fee-range">Max monthly fee · <b style={{ color: 'var(--cyan)' }}>{rupee(maxFee)}</b></label>
          <input
            id="fee-range" type="range" min={5000} max={10000} step={100} value={maxFee}
            onChange={(e) => setMaxFee(Number(e.target.value))}
            aria-valuetext={rupee(maxFee)}
          />
          <div className="row-between tiny dim"><span>₹5,000</span><span>₹10,000</span></div>
        </div>

        <div className="field">
          <label>Minimum available beds</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[0, 1, 2, 3].map((n) => (
              <button key={n} className={`chip ${minBeds === n ? 'on' : ''}`} aria-pressed={minBeds === n} onClick={() => setMinBeds(n)}>
                {n === 0 ? 'Any' : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Facilities</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {ALL_FACILITIES.map((f) => (
              <button key={f} className={`chip ${facilities.includes(f) ? 'on' : ''}`} aria-pressed={facilities.includes(f)} onClick={() => toggle(facilities, setFacilities, f)}>
                {f}
              </button>
            ))}
          </div>
          <span className="tiny dim">Rooms must have every selected facility.</span>
        </div>

        <label className="switch">
          <input type="checkbox" checked={onlyShortlist} onChange={(e) => setOnlyShortlist(e.target.checked)} style={{ width: 17, height: 17, accentColor: '#8b5cf6' }} />
          Show only my shortlist ({shortlist.length})
        </label>
      </div>
    </div>
  )

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Smart room explorer"
        title="Explore hostel rooms"
        sub="Filter 36 demo rooms across 3 blocks by AC type, capacity, floor, fee band, facilities and live status. Shortlist favourites and compare up to three side by side."
        right={
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 0, border: '1px solid var(--stroke)', borderRadius: 999, padding: 3, background: 'rgba(9,14,38,0.6)' }}>
              <button
                className={`btn btn-xs ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}
                aria-pressed={view === 'grid'} aria-label="Grid view" style={{ borderRadius: 999 }}
              >
                <Icon name="grid" size={15} /> Grid
              </button>
              <button
                className={`btn btn-xs ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}
                aria-pressed={view === 'list'} aria-label="List view" style={{ borderRadius: 999 }}
              >
                <Icon name="list" size={15} /> List
              </button>
            </div>
          </div>
        }
      />

      {/* Search + sort bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="filter-bar">
          <Field label="Search rooms" id="room-search" hint="Try “ARV-201”, “AC”, “balcony” or “3-seater”">
            <div className="search">
              <Icon name="search" size={17} />
              <input
                id="room-search" className="input" type="search" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by room number, block, floor or facility…"
                aria-label="Search rooms"
              />
            </div>
          </Field>

          <Field label="Sort results" id="room-sort">
            <select id="room-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>

          <div className="row" style={{ gap: 8 }}>
            <Button variant="ghost" icon="filter" onClick={() => setShowFilters((v) => !v)} className="show-mobile-only">
              Filters {activeCount > 0 && `(${activeCount})`}
            </Button>
            <Button variant="ghost" icon="refresh" onClick={clearAll} title="Reset all filters">Reset</Button>
          </div>
        </div>

        <div className="row-between" style={{ marginTop: 14, gap: 12, flexWrap: 'wrap' }}>
          <div className="row small muted" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="row" style={{ gap: 6 }}>
              <b style={{ color: 'var(--text)' }}>{results.length}</b> of {rooms.length} rooms match
            </span>
            <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="chip-tag" style={{ color: 'var(--ok)' }}>{results.reduce((a, r) => a + bedCounts(r).available, 0)} beds available</span>
              <span className="chip-tag" style={{ color: 'var(--info)' }}>{results.filter((r) => r.type === 'AC').length} AC</span>
              <span className="chip-tag">{results.filter((r) => r.seater === 3).length} three-seater</span>
            </span>
          </div>

          {activeCount > 0 && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {types.map((t) => <button key={t} className="chip on" onClick={() => toggle(types, setTypes, t)}>{t} <Icon name="x" size={12} /></button>)}
              {seaters.map((s) => <button key={s} className="chip on" onClick={() => toggle(seaters, setSeaters, s)}>{s}-seater <Icon name="x" size={12} /></button>)}
              {buildings.map((b) => <button key={b} className="chip on" onClick={() => toggle(buildings, setBuildings, b)}>{getBuilding(b)?.code} <Icon name="x" size={12} /></button>)}
              {floors.map((f) => <button key={f} className="chip on" onClick={() => toggle(floors, setFloors, f)}>{floorName(f)} <Icon name="x" size={12} /></button>)}
              {statuses.map((s) => <button key={s} className="chip on" onClick={() => toggle(statuses, setStatuses, s)}>{s} <Icon name="x" size={12} /></button>)}
              {facilities.map((f) => <button key={f} className="chip on" onClick={() => toggle(facilities, setFacilities, f)}>{f} <Icon name="x" size={12} /></button>)}
            </div>
          )}
        </div>
      </div>

      {/* Status legend */}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <span className="tiny muted">Status legend:</span>
        <StatusBadge status="available" />
        <StatusBadge status="partial" />
        <StatusBadge status="full" />
        <StatusBadge status="reserved" />
        <StatusBadge status="maintenance" />
      </div>

      <div className="split">
        {(!isMobile || showFilters) && <aside>{FilterPanel}</aside>}

        <div>
          {loading ? (
            <SkeletonGrid count={6} />
          ) : results.length === 0 ? (
            <EmptyState
              icon="search"
              title="No rooms match those filters"
              message="Try widening the fee range, clearing the facility requirement, or resetting all filters to see every room again."
              action={<Button variant="primary" icon="refresh" onClick={clearAll}>Reset all filters</Button>}
            />
          ) : (
            <div className={`grid ${view === 'grid' ? 'g-auto-300' : ''} ${view === 'list' ? 'list-view' : ''}`} style={view === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
              {results.map((room, i) => (
                <RoomCard key={room.id} room={room} view={view} onOpen={openRoom} index={i} />
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <p className="small muted" style={{ marginTop: 22, textAlign: 'center' }}>
              Showing all {results.length} matching rooms. Occupant identities are never displayed publicly — only bed status.
            </p>
          )}
        </div>
      </div>

      <RoomDetail room={detail} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <CompareTray />

      <style>{`
        .show-mobile-only { display: none; }
        @media (max-width: 1024px) {
          .show-mobile-only { display: inline-flex; }
        }
      `}</style>
    </div>
  )
}
