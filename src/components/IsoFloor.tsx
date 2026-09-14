import React, { useMemo } from 'react'
import { Room, bedCounts, floorName, roomStatus } from '../data/mock'

/* =========================================================================
   IsoPlan — a hand-projected axonometric floor plan rendered as SVG.

   Why SVG instead of CSS 3D?
   • Hit-testing follows the drawn geometry exactly, so every room block is
     reliably hoverable/clickable (CSS preserve-3d hit regions drift from the
     painted geometry in Chromium, which made blocks feel unresponsive).
   • Labels stay upright and crisp at any zoom.
   • Panels, skirts and stacked floors are a handful of polygons — cheaper to
     render than dozens of composited 3D layers.
   ========================================================================= */

const PLAN_W = 640
const PLAN_D = 400
const PAD = 20
const CORRIDOR = 110
const WING_W = (PLAN_W - PAD * 2 - CORRIDOR) / 2
const ROOM_H = 100
const ROOM_GAP = 10
const ROOM_ELEV = 26      // extrusion of a room block above the floor plate
const UTIL_ELEV = 12
const PLATE = 16          // slab thickness
const FLOOR_STACK = 104   // vertical gap between floors in the stacked view

const rad = (deg: number) => (deg * Math.PI) / 180

export interface Projected { x: number; y: number }

/** Axonometric projection: yaw about the vertical axis, then tilt by pitch. */
export function makeProjector(pitchDeg: number, yawDeg: number, zoom: number) {
  const yaw = rad(yawDeg)
  const pitch = rad(pitchDeg)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  return (x: number, y: number, z: number): Projected => {
    const x1 = x * cy + y * sy
    const y1 = -x * sy + y * cy
    return { x: x1 * zoom, y: (y1 * cp - z * sp) * zoom }
  }
}

type Pt = [number, number, number]
const toPath = (pts: Pt[], project: (x: number, y: number, z: number) => Projected) =>
  pts.map(([x, y, z]) => { const p = project(x, y, z); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')

/** The four corners of an axis-aligned box footprint. */
const corners = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y, 0], [x + w, y, 0], [x + w, y + h, 0], [x, y + h, 0],
]

interface BlockProps {
  x: number; y: number; w: number; h: number; base: number; elev: number
  top: string; left: string; right: string; stroke: string
  project: (x: number, y: number, z: number) => Projected
}

/** A solid rectangular volume: four side faces, then the top face on top. */
function Volume({ x, y, w, h, base, elev, top, left, right, stroke, project }: BlockProps) {
  const c = corners(x, y, w, h)
  const zTop = base + elev
  const basePts = c.map(([px, py]) => [px, py, base] as Pt)
  const topPts = c.map(([px, py]) => [px, py, zTop] as Pt)

  return (
    <g>
      {c.map((_, i) => {
        const j = (i + 1) % 4
        const face = [basePts[i], basePts[j], topPts[j], topPts[i]]
        const shade = i === 0 || i === 3 ? left : right
        return <polygon key={i} points={toPath(face, project)} fill={shade} stroke={stroke} strokeWidth="0.6" />
      })}
      <polygon points={toPath(topPts, project)} fill={top} stroke={stroke} strokeWidth="0.9" />
    </g>
  )
}

function BedVolume({ x, y, w, h, base, status, project }: { x: number; y: number; w: number; h: number; base: number; status: string; project: (x: number, y: number, z: number) => Projected }) {
  const fill = STATUS_FILL[status] ?? STATUS_FILL.available
  return (
    <Volume
      x={x} y={y} w={w} h={h} base={base} elev={5}
      top={fill.dot} left={fill.left} right={fill.right}
      stroke={fill.stroke} project={project}
    />
  )
}

const STATUS_FILL: Record<string, { top: string; left: string; right: string; stroke: string; dot: string }> = {
  available: { top: 'rgba(52,211,153,0.22)', left: 'rgba(16,120,90,0.65)', right: 'rgba(24,160,116,0.55)', stroke: 'rgba(52,211,153,0.85)', dot: '#34d399' },
  partial: { top: 'rgba(251,191,36,0.20)', left: 'rgba(150,105,10,0.65)', right: 'rgba(190,140,20,0.55)', stroke: 'rgba(251,191,36,0.85)', dot: '#fbbf24' },
  full: { top: 'rgba(251,113,133,0.19)', left: 'rgba(150,45,62,0.65)', right: 'rgba(190,66,88,0.55)', stroke: 'rgba(251,113,133,0.85)', dot: '#fb7185' },
  reserved: { top: 'rgba(56,189,248,0.20)', left: 'rgba(20,90,140,0.65)', right: 'rgba(30,120,180,0.55)', stroke: 'rgba(56,189,248,0.85)', dot: '#38bdf8' },
  maintenance: { top: 'rgba(148,163,184,0.18)', left: 'rgba(70,85,105,0.65)', right: 'rgba(95,112,135,0.55)', stroke: 'rgba(148,163,184,0.7)', dot: '#94a3b8' },
}

export interface IsoPlanProps {
  rooms: Room[]
  floor: number
  buildingCode: string
  pitch: number
  yaw: number
  zoom: number
  hoveredId?: string | null
  filterStatus?: string | null
  shortlist: string[]
  onRoomHover: (room: Room | null) => void
  onRoomOpen: (room: Room) => void
}

export function IsoPlan({
  rooms, floor, buildingCode, pitch, yaw, zoom, hoveredId, filterStatus, shortlist, onRoomHover, onRoomOpen,
}: IsoPlanProps) {
  const project = useMemo(() => makeProjector(pitch, yaw, zoom), [pitch, yaw, zoom])

  const sorted = useMemo(() => [...rooms].sort((a, b) => a.number.localeCompare(b.number)), [rooms])
  const left = sorted.slice(0, 2)
  const right = sorted.slice(2)

  const leftX = PAD
  const rightX = PAD + WING_W + CORRIDOR
  const roomSlots: { room: Room; x: number; y: number; w: number; h: number }[] = []
  left.forEach((room, i) => roomSlots.push({ room, x: leftX, y: PAD + i * (ROOM_H + ROOM_GAP), w: WING_W, h: ROOM_H }))
  right.forEach((room, i) => roomSlots.push({ room, x: rightX, y: PAD + i * (ROOM_H + ROOM_GAP), w: WING_W, h: ROOM_H }))

  const utilY1 = PAD + 2 * ROOM_H + ROOM_GAP + 12
  const utilY2 = utilY1 + 68
  const utilities = [
    { label: 'Washroom', x: leftX, y: utilY1, w: WING_W, h: 56 },
    { label: 'Stairs & Lift', x: rightX, y: utilY1, w: WING_W, h: 56 },
    { label: 'Reading Hall', x: leftX, y: utilY2, w: WING_W, h: 56 },
    { label: 'Pantry · Wi-Fi AP', x: rightX, y: utilY2, w: WING_W, h: 56 },
  ]
  const rightFree = right.length === 0

  const topZ = ROOM_ELEV + 4
  const bbox = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y, z] of [
      [0, 0, -PLATE], [PLAN_W, 0, -PLATE], [PLAN_W, PLAN_D, -PLATE], [0, PLAN_D, -PLATE],
      [0, 0, topZ], [PLAN_W, 0, topZ], [PLAN_W, PLAN_D, topZ], [0, PLAN_D, topZ],
    ] as Pt[]) {
      const p = project(x, y, z)
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    const pad = 34
    return `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`
  })()

  const labelFor = (room: Room) => {
    const c = bedCounts(room)
    return `${room.number} · ${room.type} · ${room.seater}-seater · ${c.available} of ${c.total} beds free · ${floorName(room.floor)}`
  }

  return (
    <svg
      viewBox={bbox}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Isometric floor plan of ${buildingCode}, ${floorName(floor)}`}
      style={{ display: 'block', maxHeight: '100%' }}
    >
      <defs>
        <linearGradient id="plateTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#243063" />
          <stop offset="100%" stopColor="#10173b" />
        </linearGradient>
        <linearGradient id="plateLeft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1430" />
          <stop offset="100%" stopColor="#06091c" />
        </linearGradient>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ---------- floor plate + shadow ---------- */}
      <Volume
        x={0} y={0} w={PLAN_W} h={PLAN_D} base={-PLATE} elev={PLATE}
        top="url(#plateTop)" left="url(#plateLeft)" right="#0a0f28"
        stroke="rgba(147,168,255,0.32)" project={project}
      />

      {/* ---------- corridor ---------- */}
      <polygon
        points={toPath(corners(PAD + WING_W + 8, PAD, CORRIDOR - 16, PLAN_D - PAD * 2), project)}
        fill="rgba(147,168,255,0.06)"
        stroke="rgba(147,168,255,0.35)"
        strokeWidth="1"
        strokeDasharray="7 6"
      />
      <text
        x={project(PAD + WING_W + CORRIDOR / 2, PLAN_D / 2, 2).x}
        y={project(PAD + WING_W + CORRIDOR / 2, PLAN_D / 2, 2).y}
        fill="rgba(147,168,255,0.65)"
        fontSize="10"
        fontWeight="800"
        letterSpacing="3"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-58 ${project(PAD + WING_W + CORRIDOR / 2, PLAN_D / 2, 2).x} ${project(PAD + WING_W + CORRIDOR / 2, PLAN_D / 2, 2).y})`}
      >
        CENTRAL CORRIDOR
      </text>

      {/* ---------- shared utilities ---------- */}
      {utilities.map((u) => {
        const p = project(u.x + u.w / 2, u.y + u.h / 2, UTIL_ELEV + 1)
        return (
          <g key={u.label} style={{ pointerEvents: 'none' }}>
            <Volume
              x={u.x} y={u.y} w={u.w} h={u.h} base={0} elev={UTIL_ELEV}
              top="rgba(147,168,255,0.07)" left="rgba(10,16,44,0.8)" right="rgba(14,20,52,0.8)"
              stroke="rgba(147,168,255,0.35)" project={project}
            />
            <text x={p.x} y={p.y - 2} fill="rgba(147,168,255,0.9)" fontSize="10" fontWeight="800" letterSpacing="1.4" textAnchor="middle">{u.label.toUpperCase()}</text>
          </g>
        )
      })}
      {rightFree && (
        <g style={{ pointerEvents: 'none' }}>
          <Volume
            x={rightX} y={PAD + ROOM_H + ROOM_GAP} w={WING_W} h={ROOM_H} base={0} elev={UTIL_ELEV}
            top="rgba(147,168,255,0.05)" left="rgba(10,16,44,0.75)" right="rgba(14,20,52,0.75)"
            stroke="rgba(147,168,255,0.26)" project={project}
          />
          <text
            x={project(rightX + WING_W / 2, PAD + ROOM_H + ROOM_GAP + ROOM_H / 2, UTIL_ELEV + 1).x}
            y={project(rightX + WING_W / 2, PAD + ROOM_H + ROOM_GAP + ROOM_H / 2, UTIL_ELEV + 1).y}
            fill="rgba(147,168,255,0.6)" fontSize="10" fontWeight="700" letterSpacing="1.4" textAnchor="middle"
          >
            COMMON ROOM
          </text>
        </g>
      )}

      {/* ---------- room blocks ---------- */}
      {roomSlots.map(({ room, x, y, w, h }) => {
        const rStatus = roomStatus(room)
        const matchesFilter = !filterStatus || filterStatus === rStatus
        const fill = STATUS_FILL[rStatus] ?? STATUS_FILL.available
        const counts = bedCounts(room)
        const active = hoveredId === room.id
        const lifted = active ? 12 : 0
        const centre = project(x + w / 2, y + h / 2, ROOM_ELEV + lifted + 1)
        const dimOpacity = matchesFilter ? 1 : 0.35

        return (
          <g
            key={room.id}
            className="iso-room"
            role="button"
            tabIndex={0}
            aria-label={labelFor(room)}
            opacity={dimOpacity}
            style={{
              cursor: 'pointer',
              transform: `translateY(${-lifted * 0.9}px)`,
              transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.28s',
              outline: 'none',
            }}
            onMouseEnter={() => onRoomHover(room)}
            onMouseLeave={() => onRoomHover(null)}
            onFocus={() => onRoomHover(room)}
            onBlur={() => onRoomHover(null)}
            onClick={() => onRoomOpen(room)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRoomOpen(room) }
            }}
          >
            <g filter={active ? 'url(#softGlow)' : undefined}>
              <Volume
                x={x} y={y} w={w} h={h} base={0} elev={ROOM_ELEV + lifted}
                top={fill.top} left={fill.left} right={fill.right}
                stroke={active ? '#22d3ee' : fill.stroke} project={project}
              />
            </g>

            {/* 3D bed blocks inside room */}
            {room.beds.map((bed, i) => {
              const bw = 24
              const bh = 42
              const bx = x + 14 + (i % 2) * (bw + 12)
              const by = y + 14 + Math.floor(i / 2) * (bh + 8)
              return (
                <g key={bed.id} style={{ pointerEvents: 'none' }}>
                  <BedVolume
                    x={bx} y={by} w={bw} h={bh}
                    base={ROOM_ELEV + lifted}
                    status={bed.status}
                    project={project}
                  />
                </g>
              )
            })}

            {/* labels stay upright */}
            <text x={centre.x} y={centre.y - 12} fill="#ffffff" fontSize="13" fontWeight="800" letterSpacing="-0.2" textAnchor="middle">
              {room.number}
            </text>
            <text x={centre.x} y={centre.y + 3} fill="rgba(215,224,255,0.9)" fontSize="9.5" fontWeight="600" textAnchor="middle">
              {room.type} · {room.seater}-seater · {counts.available}/{counts.total} free
            </text>

            {shortlist.includes(room.id) && (
              <text x={centre.x} y={centre.y + 18} fill="#22d3ee" fontSize="9.5" fontWeight="800" textAnchor="middle">★ SHORTLISTED</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Stacked (exploded) view — every floor at once, lower floors dimmed. */
export function IsoPlanStack({
  roomsByFloor, buildingCode, pitch, yaw, zoom, hoveredId, shortlist, onRoomHover, onRoomOpen,
}: {
  roomsByFloor: { floor: number; rooms: Room[] }[]
  buildingCode: string
  pitch: number
  yaw: number
  zoom: number
  hoveredId?: string | null
  shortlist: string[]
  onRoomHover: (room: Room | null) => void
  onRoomOpen: (room: Room) => void
}) {
  const project = useMemo(() => makeProjector(pitch, yaw, zoom), [pitch, yaw, zoom])
  const sortedFloors = useMemo(() => [...roomsByFloor].sort((a, b) => a.floor - b.floor), [roomsByFloor])

  const bbox = (() => {
    const top = sortedFloors.length * FLOOR_STACK + ROOM_ELEV
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y, z] of [
      [0, 0, -PLATE], [PLAN_W, 0, -PLATE], [PLAN_W, PLAN_D, -PLATE], [0, PLAN_D, -PLATE],
      [0, 0, top], [PLAN_W, 0, top], [PLAN_W, PLAN_D, top], [0, PLAN_D, top],
    ] as Pt[]) {
      const p = project(x, y, z)
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    const pad = 34
    return `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`
  })()

  return (
    <svg
      viewBox={bbox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label={`Stacked isometric view of all floors, ${buildingCode}`}
      style={{ display: 'block', maxHeight: '100%' }}
    >
      <defs>
        <linearGradient id="stackPlate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b3a7a" />
          <stop offset="100%" stopColor="#131c4a" />
        </linearGradient>
        <filter id="stackGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {sortedFloors.map(({ floor, rooms }, fi) => {
        const base = fi * FLOOR_STACK
        const dim = 0.78 + (fi / Math.max(sortedFloors.length - 1, 1)) * 0.22
        const sorted = [...rooms].sort((a, b) => a.number.localeCompare(b.number))
        const left = sorted.slice(0, 2)
        const right = sorted.slice(2)
        const leftX = PAD
        const rightX = PAD + WING_W + CORRIDOR
        const slots = [
          ...left.map((room, i) => ({ room, x: leftX, y: PAD + i * (ROOM_H + ROOM_GAP), w: WING_W, h: ROOM_H })),
          ...right.map((room, i) => ({ room, x: rightX, y: PAD + i * (ROOM_H + ROOM_GAP), w: WING_W, h: ROOM_H })),
        ]
        return (
          <g key={floor} opacity={dim}>
            <Volume
              x={0} y={0} w={PLAN_W} h={PLAN_D} base={base - PLATE} elev={PLATE}
              top="url(#stackPlate)" left="#0d1436" right="#0a1030"
              stroke="rgba(147,168,255,0.3)" project={project}
            />
            <text
              x={project(0, PLAN_D + 6, base).x} y={project(0, PLAN_D + 6, base).y}
              fill="rgba(34,211,238,0.9)" fontSize="11" fontWeight="800" letterSpacing="2"
            >
              {floor === 0 ? 'GROUND' : `FLOOR ${floor}`}
            </text>
            {slots.map(({ room, x, y, w, h }) => {
              const fill = STATUS_FILL[roomStatus(room)] ?? STATUS_FILL.available
              const active = hoveredId === room.id
              const lifted = active ? 10 : 0
              const centre = project(x + w / 2, y + h / 2, base + ROOM_ELEV + lifted + 1)
              return (
                <g
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Room ${room.number}, ${roomStatus(room)}, floor ${floor}`}
                  style={{ cursor: 'pointer', transform: `translateY(${-lifted * 0.9}px)`, transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)', outline: 'none' }}
                  onMouseEnter={() => onRoomHover(room)}
                  onMouseLeave={() => onRoomHover(null)}
                  onFocus={() => onRoomHover(room)}
                  onBlur={() => onRoomHover(null)}
                  onClick={() => onRoomOpen(room)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRoomOpen(room) } }}
                >
                  <g filter={active ? 'url(#stackGlow)' : undefined}>
                    <Volume
                      x={x} y={y} w={w} h={h} base={base} elev={ROOM_ELEV + lifted}
                      top={fill.top} left={fill.left} right={fill.right}
                      stroke={active ? '#22d3ee' : fill.stroke} project={project}
                    />
                  </g>
                  <text x={centre.x} y={centre.y - 6} fill="#eaf0ff" fontSize="12" fontWeight="800" textAnchor="middle">{room.number}</text>
                  <title>{`Room ${room.number} · ${roomStatus(room)} · ${bedCounts(room).available}/${bedCounts(room).total} beds free`}</title>
                  <text x={centre.x} y={centre.y + 7} fill="rgba(195,204,237,0.8)" fontSize="9" textAnchor="middle">
                    {bedCounts(room).available}/{bedCounts(room).total} free
                  </text>
                  {shortlist.includes(room.id) && (
                    <text x={centre.x} y={centre.y + 20} fill="#22d3ee" fontSize="8.5" fontWeight="700" textAnchor="middle">★</text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/* =========================================================================
   Combined Campus 3D Master Plan — All 3 Blocks (ARV, NLG, VND) + Courtyard
   ========================================================================= */
const CAMPUS_W = 1080
const CAMPUS_D = 740

export interface IsoCampusMasterPlanProps {
  allRooms: Room[]
  pitch: number
  yaw: number
  zoom: number
  hoveredId?: string | null
  filterStatus?: string | null
  shortlist: string[]
  onRoomHover: (room: Room | null) => void
  onRoomOpen: (room: Room) => void
  onSelectBuilding: (buildingId: string) => void
}

export function IsoCampusMasterPlan({
  allRooms, pitch, yaw, zoom, hoveredId, filterStatus, shortlist, onRoomHover, onRoomOpen, onSelectBuilding,
}: IsoCampusMasterPlanProps) {
  const project = useMemo(() => makeProjector(pitch, yaw, zoom), [pitch, yaw, zoom])

  const b1Rooms = useMemo(() => allRooms.filter((r) => r.buildingId === 'B1'), [allRooms])
  const b2Rooms = useMemo(() => allRooms.filter((r) => r.buildingId === 'B2'), [allRooms])
  const b3Rooms = useMemo(() => allRooms.filter((r) => r.buildingId === 'B3'), [allRooms])

  const blockLayouts = [
    { id: 'B1', name: 'Aravalli Block', code: 'ARV', x: 50, y: 60, w: 320, h: 260, rooms: b1Rooms, label: 'ARAVALLI BLOCK (BOYS)' },
    { id: 'B2', name: 'Nilgiri Block', code: 'NLG', x: 710, y: 60, w: 320, h: 260, rooms: b2Rooms, label: 'NILGIRI BLOCK (BOYS)' },
    { id: 'B3', name: 'Vindhya Block', code: 'VND', x: 380, y: 440, w: 320, h: 240, rooms: b3Rooms, label: 'VINDHYA BLOCK (GIRLS)' },
  ]

  const topZ = 160
  const bbox = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [x, y, z] of [
      [0, 0, -PLATE], [CAMPUS_W, 0, -PLATE], [CAMPUS_W, CAMPUS_D, -PLATE], [0, CAMPUS_D, -PLATE],
      [0, 0, topZ], [CAMPUS_W, 0, topZ], [CAMPUS_W, CAMPUS_D, topZ], [0, CAMPUS_D, topZ],
    ] as Pt[]) {
      const p = project(x, y, z)
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    const pad = 36
    return `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`
  })()

  return (
    <svg
      viewBox={bbox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label="Combined 3D Campus Master Plan showing all hostel blocks"
      style={{ display: 'block', maxHeight: '100%' }}
    >
      <defs>
        <linearGradient id="campusGround" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e274a" />
          <stop offset="100%" stopColor="#0b1026" />
        </linearGradient>
        <linearGradient id="messRoof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(56,189,248,0.3)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.2)" />
        </linearGradient>
      </defs>

      {/* ---------- Ground Base Slab ---------- */}
      <Volume
        x={0} y={0} w={CAMPUS_W} h={CAMPUS_D} base={-PLATE} elev={PLATE}
        top="url(#campusGround)" left="#0a0d1f" right="#070a19"
        stroke="rgba(147,168,255,0.25)" project={project}
      />

      {/* ---------- Pathways & Roads ---------- */}
      <polygon
        points={toPath(corners(380, 60, 310, 360), project)}
        fill="rgba(147,168,255,0.04)" stroke="rgba(147,168,255,0.2)" strokeDasharray="6 5"
      />
      <polygon
        points={toPath(corners(50, 340, 980, 80), project)}
        fill="rgba(147,168,255,0.04)" stroke="rgba(147,168,255,0.2)" strokeDasharray="6 5"
      />

      {/* ---------- Central Mess & Recreation Pavilion ---------- */}
      <g style={{ pointerEvents: 'none' }}>
        <Volume
          x={410} y={100} w={250} h={180} base={0} elev={35}
          top="url(#messRoof)" left="rgba(30,40,90,0.7)" right="rgba(40,50,110,0.7)"
          stroke="rgba(56,189,248,0.4)" project={project}
        />
        <text
          x={project(535, 190, 38).x} y={project(535, 190, 38).y}
          fill="rgba(56,189,248,0.95)" fontSize="11" fontWeight="800" letterSpacing="1.5" textAnchor="middle"
        >
          CENTRAL MESS & DINING HALL
        </text>
      </g>

      {/* ---------- Central Courtyard Sports Lawn ---------- */}
      <polygon
        points={toPath(corners(410, 300, 250, 110), project)}
        fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)" strokeWidth="1"
      />
      <text
        x={project(535, 355, 2).x} y={project(535, 355, 2).y}
        fill="rgba(52,211,153,0.85)" fontSize="9.5" fontWeight="700" letterSpacing="1.5" textAnchor="middle"
      >
        COURTYARD & SPORTS LAWN
      </text>

      {/* ---------- 3D Blocks (ARV, NLG, VND) ---------- */}
      {blockLayouts.map((blk) => {
        const sortedRooms = [...blk.rooms].sort((a, b) => a.number.localeCompare(b.number))
        const floors = [0, 1, 2, 3]
        const blkHeaderP = project(blk.x + blk.w / 2, blk.y - 12, 140)

        return (
          <g key={blk.id}>
            {/* Block Header Title */}
            <g
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectBuilding(blk.id)}
            >
              <rect
                x={blkHeaderP.x - 90} y={blkHeaderP.y - 16} width={180} height={24} rx={6}
                fill="rgba(18,18,21,0.9)" stroke="var(--cyan)" strokeWidth="1"
              />
              <text
                x={blkHeaderP.x} y={blkHeaderP.y}
                fill="#ffffff" fontSize="10.5" fontWeight="800" letterSpacing="1" textAnchor="middle" dominantBaseline="middle"
              >
                {blk.label}
              </text>
            </g>

            {/* 4 Floor Slices Stacked */}
            {floors.map((fl) => {
              const flRooms = sortedRooms.filter((r) => r.floor === fl)
              const stackElev = fl * 28
              const flBase = 4 + stackElev

              return flRooms.map((room, ri) => {
                const rStatus = roomStatus(room)
                const matchesFilter = !filterStatus || filterStatus === rStatus
                const fill = STATUS_FILL[rStatus] ?? STATUS_FILL.available
                const active = hoveredId === room.id
                const lifted = active ? 8 : 0
                const col = ri % 2
                const row = Math.floor(ri / 2)
                const rx = blk.x + 18 + col * 142
                const ry = blk.y + 18 + row * 105
                const rw = 130
                const rh = 92
                const centre = project(rx + rw / 2, ry + rh / 2, flBase + 18 + lifted)

                return (
                  <g
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Room ${room.number}, ${rStatus}`}
                    opacity={matchesFilter ? 1 : 0.3}
                    style={{
                      cursor: 'pointer',
                      transform: `translateY(${-lifted * 0.9}px)`,
                      transition: 'transform 0.25s, opacity 0.25s',
                      outline: 'none',
                    }}
                    onMouseEnter={() => onRoomHover(room)}
                    onMouseLeave={() => onRoomHover(null)}
                    onFocus={() => onRoomHover(room)}
                    onBlur={() => onRoomHover(null)}
                    onClick={() => onRoomOpen(room)}
                  >
                    <g filter={active ? 'url(#softGlow)' : undefined}>
                      <Volume
                        x={rx} y={ry} w={rw} h={rh} base={flBase} elev={16 + lifted}
                        top={fill.top} left={fill.left} right={fill.right}
                        stroke={active ? '#22d3ee' : fill.stroke} project={project}
                      />
                    </g>
                    <text x={centre.x} y={centre.y - 4} fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
                      {room.number}
                    </text>
                    <text x={centre.x} y={centre.y + 8} fill="rgba(215,224,255,0.85)" fontSize="8.5" textAnchor="middle">
                      {bedCounts(room).available}/{bedCounts(room).total} free
                    </text>
                    {shortlist.includes(room.id) && (
                      <text x={centre.x} y={centre.y + 18} fill="#22d3ee" fontSize="8" fontWeight="800" textAnchor="middle">★</text>
                    )}
                  </g>
                )
              })
            })}
          </g>
        )
      })}
    </svg>
  )
}

