import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BUILDINGS, FLOORS, ROOMS, Room, bedCounts, floorName, floorShort, getBuilding, roomStatus, rupee,
} from '../data/mock'
import { Icon } from '../lib/icons'
import { Button, EmptyState, SectionHead, StatusBadge } from '../lib/ui'
import { IsoPlan, IsoPlanStack } from '../components/IsoFloor'
import { RoomDetail } from '../components/RoomDetail'
import { useApp } from '../lib/store'

type Camera = 'iso' | 'top' | 'front'
const CAMERAS: Record<Camera, { pitch: number; yaw: number; label: string }> = {
  iso: { pitch: 54, yaw: 42, label: 'Isometric' },
  top: { pitch: 6, yaw: 42, label: 'Top-down' },
  front: { pitch: 76, yaw: 14, label: 'Front' },
}

const LEGEND = [
  { status: 'available', label: 'Available' },
  { status: 'partial', label: 'Partially occupied' },
  { status: 'full', label: 'Fully occupied' },
  { status: 'reserved', label: 'Reserved' },
  { status: 'maintenance', label: 'Under maintenance' },
]

export function HostelMap() {
  const { shortlist } = useApp()
  const viewportRef = useRef<HTMLDivElement>(null)

  const [buildingId, setBuildingId] = useState(BUILDINGS[0].id)
  const [floor, setFloor] = useState<number | 'all'>(0)
  const [camera, setCamera] = useState<Camera>('iso')
  const [zoom, setZoom] = useState(0.85)
  const [angles, setAngles] = useState({ pitch: CAMERAS.iso.pitch, yaw: CAMERAS.iso.yaw })
  const [hovered, setHovered] = useState<Room | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [detail, setDetail] = useState<Room | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const building = getBuilding(buildingId)
  const buildingRooms = useMemo(() => ROOMS.filter((r) => r.buildingId === buildingId), [buildingId])
  const visibleRooms = useMemo(
    () => (floor === 'all' ? buildingRooms : buildingRooms.filter((r) => r.floor === floor)).sort((a, b) => a.number.localeCompare(b.number)),
    [buildingRooms, floor],
  )

  const stats = useMemo(() => {
    const beds = visibleRooms.flatMap((r) => r.beds)
    return {
      rooms: visibleRooms.length,
      available: beds.filter((b) => b.status === 'available').length,
      occupied: beds.filter((b) => b.status === 'occupied').length,
      reserved: beds.filter((b) => b.status === 'reserved').length,
      maintenance: beds.filter((b) => b.status === 'maintenance').length,
    }
  }, [visibleRooms])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const apply = () => setZoom(mq.matches ? 0.6 : 0.85)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /* Camera preset switching tweens pitch/yaw for a smooth "orbit". */
  const tweenRef = useRef<number>(0)
  useEffect(() => {
    const target = CAMERAS[camera]
    const from = { ...angles }
    const t0 = performance.now()
    const dur = 420
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setAngles({
        pitch: from.pitch + (target.pitch - from.pitch) * e,
        yaw: from.yaw + (target.yaw - from.yaw) * e,
      })
      if (p < 1) tweenRef.current = requestAnimationFrame(tick)
    }
    tweenRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(tweenRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  /* Drag to orbit.
     Note: we deliberately avoid setPointerCapture() here — capturing on the
     viewport would retarget the subsequent `click` to the viewport and swallow
     room-block clicks. Dragging is tracked on window instead. */
  const drag = useRef<{ x: number; y: number; pitch: number; yaw: number } | null>(null)

  const onWindowDrag = useCallback((e: PointerEvent) => {
    if (!drag.current) return
    setAngles({
      pitch: Math.max(4, Math.min(84, drag.current.pitch - (e.clientY - drag.current.y) * 0.32)),
      yaw: drag.current.yaw + (e.clientX - drag.current.x) * 0.4,
    })
  }, [])

  const endDrag = useCallback(() => {
    drag.current = null
    window.removeEventListener('pointermove', onWindowDrag)
  }, [onWindowDrag])

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, pitch: angles.pitch, yaw: angles.yaw }
    window.addEventListener('pointermove', onWindowDrag)
    window.addEventListener('pointerup', endDrag, { once: true })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (rect) setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  useEffect(() => () => { window.removeEventListener('pointermove', onWindowDrag); window.removeEventListener('pointerup', endDrag) }, [onWindowDrag, endDrag])

  /* Native wheel listener so zooming the plan never scrolls the page by mistake. */
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => Math.max(0.45, Math.min(1.7, z - e.deltaY * 0.0012)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const openRoom = useCallback((room: Room) => { setDetail(room); setDetailOpen(true) }, [])
  const setFloorSafe = (f: number | 'all') => { setFloor(f); setHovered(null) }
  const resetView = () => {
    setCamera('iso')
    setAngles({ pitch: CAMERAS.iso.pitch, yaw: CAMERAS.iso.yaw })
    setZoom(window.matchMedia('(max-width: 720px)').matches ? 0.6 : 0.85)
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Interactive 3D hostel map"
        title="Walk the block before you book"
        sub="Pick a building and floor, then drag to orbit the plan, scroll to zoom, and click any room block to open its full detail panel — bed by bed. Colours follow live availability."
        right={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="chip-tag cyan"><Icon name="layers" size={12} /> Vector-rendered · runs without WebGL</span>
            <Button variant="ghost" size="sm" icon="refresh" onClick={resetView}>Reset view</Button>
          </div>
        }
      />

      {/* Building + floor selectors */}
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="filter-bar-2">
          <div className="field">
            <label>Building / block</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {BUILDINGS.map((b) => (
                <button
                  key={b.id} className={`chip ${buildingId === b.id ? 'on' : ''}`}
                  aria-pressed={buildingId === b.id}
                  onClick={() => { setBuildingId(b.id); setHovered(null) }}
                >
                  {b.code} · {b.name} <span style={{ opacity: 0.7 }}>{b.floorsLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Floor</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {FLOORS.map((f) => (
                <button
                  key={f} className={`chip ${floor === f ? 'on' : ''}`} aria-pressed={floor === f}
                  onClick={() => setFloorSafe(f)}
                >
                  {f === 0 ? 'Ground' : `Floor ${f}`}
                </button>
              ))}
              <button
                className={`chip ${floor === 'all' ? 'on' : ''}`} aria-pressed={floor === 'all'}
                onClick={() => setFloorSafe('all')}
              >
                <Icon name="layers" size={12} /> Stacked view
              </button>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="row-between" style={{ gap: 14, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(CAMERAS) as Camera[]).map((c) => (
              <button key={c} className={`chip ${camera === c ? 'on' : ''}`} aria-pressed={camera === c} onClick={() => setCamera(c)}>
                <Icon name="map" size={12} /> {CAMERAS[c].label}
              </button>
            ))}
            <span className="tiny dim">Drag the plan to orbit · scroll to zoom</span>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="chip-tag">{stats.rooms} rooms on view</span>
            <span className="chip-tag" style={{ color: 'var(--ok)' }}>{stats.available} beds free</span>
            <span className="chip-tag" style={{ color: 'var(--danger)' }}>{stats.occupied} occupied</span>
          </div>
        </div>
      </div>

      <div className="split-wide">
        {/* ------------------------- viewport ------------------------- */}
        <div className="map-stage">
          <div
            ref={viewportRef}
            className="map-viewport"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setPointer({ x: -999, y: -999 })}
            style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
            aria-label={`Interactive isometric plan of ${building?.name}`}
          >
            {floor === 'all' ? (
              <div style={{ width: '100%', height: '100%', minHeight: 460 }}>
                <IsoPlanStack
                  roomsByFloor={FLOORS.map((f) => ({ floor: f, rooms: buildingRooms.filter((r) => r.floor === f) }))}
                  buildingCode={building?.code ?? ''}
                  pitch={angles.pitch} yaw={angles.yaw} zoom={zoom}
                  hoveredId={hovered?.id} shortlist={shortlist}
                  onRoomHover={setHovered} onRoomOpen={openRoom}
                />
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', minHeight: 420 }}>
                <IsoPlan
                  rooms={visibleRooms}
                  floor={floor as number}
                  buildingCode={building?.code ?? ''}
                  pitch={angles.pitch} yaw={angles.yaw} zoom={zoom}
                  hoveredId={hovered?.id} shortlist={shortlist}
                  onRoomHover={setHovered} onRoomOpen={openRoom}
                />
              </div>
            )}

            {/* Hover tooltip follows the cursor */}
            {hovered && pointer.x > -100 && (
              <div className="map-tooltip" style={{ left: pointer.x + 16, top: pointer.y + 12 }} role="status">
                <div className="row-between" style={{ marginBottom: 6, gap: 10 }}>
                  <b>{hovered.number}</b>
                  <StatusBadge status={roomStatus(hovered)} />
                </div>
                <div className="tiny muted">
                  {hovered.type} · {hovered.seater}-seater · {floorName(hovered.floor)} · {getBuilding(hovered.buildingId)?.code}
                </div>
                <div className="row tiny" style={{ gap: 12, marginTop: 7 }}>
                  <span><b style={{ color: 'var(--ok)' }}>{bedCounts(hovered).available}</b> free</span>
                  <span><b style={{ color: 'var(--danger)' }}>{bedCounts(hovered).occupied}</b> occupied</span>
                  <span className="spacer" />
                  <b>{rupee(hovered.monthlyFee)}/mo</b>
                </div>
                <div className="tiny" style={{ color: 'var(--cyan)', marginTop: 6 }}>Click to open the room panel →</div>
              </div>
            )}

            <div className="map-compass">
              {floor === 'all' ? 'STACKED' : `FLOOR ${floorShort(floor as number)} · ${building?.code}`} · {Math.round(angles.yaw)}°
            </div>

            <div className="map-controls">
              <button className="map-ctrl" onClick={() => setZoom((z) => Math.min(1.7, z + 0.12))} aria-label="Zoom in"><Icon name="plus" size={18} /></button>
              <button className="map-ctrl" onClick={() => setZoom((z) => Math.max(0.45, z - 0.12))} aria-label="Zoom out"><Icon name="list" size={18} style={{ transform: 'rotate(-45deg)' }} /></button>
              <button className="map-ctrl" onClick={resetView} aria-label="Reset camera"><Icon name="refresh" size={17} /></button>
            </div>

            <div className="map-legend" aria-label="Room status legend">
              <b className="tiny" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Room status</b>
              {LEGEND.map((l) => (
                <span className="legend-item" key={l.status}>
                  <i className="legend-swatch" style={{ background: `var(--${l.status === 'partial' ? 'warn' : l.status === 'full' ? 'danger' : l.status === 'reserved' ? 'info' : l.status === 'maintenance' ? 'grey' : 'ok'})`, boxShadow: 'none' }} />
                  {l.label}
                </span>
              ))}
              <span className="legend-item" style={{ marginTop: 4, color: 'var(--muted)' }}>
                <i className="legend-swatch" style={{ background: 'rgba(147,168,255,0.25)' }} /> Bed dots show bed status
              </span>
            </div>
          </div>
        </div>

        {/* --------------------------- side panel ------------------------ */}
        <aside className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="building" size={16} /> {building?.name}</div>
            <div className="kv">
              <div className="kv-row"><span>Hostel</span><span>{building?.hostelId === 'H1' ? 'Aryabhatta Boys Hostel' : 'Kalpana Girls Hostel'}</span></div>
              <div className="kv-row"><span>Structure</span><span>{building?.floorsLabel} · {building?.floors} floors</span></div>
              <div className="kv-row"><span>Commissioned</span><span>{building?.yearBuilt}</span></div>
              <div className="kv-row"><span>Rooms in block</span><span>{buildingRooms.length}</span></div>
              <div className="kv-row"><span>Beds in block</span><span>{buildingRooms.flatMap((r) => r.beds).length}</span></div>
              <div className="kv-row"><span>Warden desk</span><span>+91 98110 22110</span></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>
              <Icon name="grid" size={16} /> {floor === 'all' ? 'All floors' : floorName(floor as number)} · {visibleRooms.length} rooms
            </div>
            {visibleRooms.length === 0 ? (
              <EmptyState icon="building" title="No rooms on this floor" message="This floor is not part of the selected block." />
            ) : (
              <div className="col" style={{ gap: 9, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                {visibleRooms.map((r) => (
                  <button
                    key={r.id} className="card tight hoverable"
                    style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    onClick={() => openRoom(r)}
                    onMouseEnter={() => setHovered(r)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(r)}
                    onBlur={() => setHovered(null)}
                  >
                    <div className="row-between" style={{ gap: 8 }}>
                      <b>{r.number}</b>
                      <StatusBadge status={roomStatus(r)} />
                    </div>
                    <div className="row tiny muted" style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <span>{r.type}</span><span>{r.seater}-seater</span><span>{floorName(r.floor)}</span>
                      <span className="spacer" />
                      <b style={{ color: 'var(--ok)' }}>{bedCounts(r).available} free</b>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="heart" size={16} /> My shortlist</div>
            {shortlist.length ? (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {shortlist.map((id) => <span key={id} className="chip-tag cyan" style={{ cursor: 'pointer' }} onClick={() => { const r = ROOMS.find((x) => x.id === id); if (r) openRoom(r) }}>{id}</span>)}
              </div>
            ) : (
              <span className="small muted">No rooms shortlisted yet. Use the heart icon on any room card or block.</span>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}><Icon name="info" size={16} /> Interaction guide</div>
            <ul className="perm-list">
              <li><Icon name="check" size={13} /> Hover a block for a live availability tooltip</li>
              <li><Icon name="check" size={13} /> Click a block (or press Enter) for the room panel</li>
              <li><Icon name="check" size={13} /> Drag to orbit, scroll or use +/− to zoom</li>
              <li><Icon name="check" size={13} /> Tab through blocks for keyboard access</li>
            </ul>
          </div>
        </aside>
      </div>

      <RoomDetail room={detail} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  )
}
