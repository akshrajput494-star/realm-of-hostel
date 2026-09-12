import React from 'react'

/* =========================================================================
   Pure-CSS isometric hostel building.
   A real 3D engine would cost ~600 KB for a hero visual, so ROH builds the
   volume from CSS 3D layers: stacked floor plates (translateZ) + four corner
   columns (rotateX(90deg)) inside a preserve-3d scene. Zero dependencies,
   GPU-composited, and it stays smooth on low-end phones.
   ========================================================================= */

export function IsoBuilding({
  floors = 4, scale = 0.92, beds, occupancy, blocks,
}: { floors?: number; scale?: number; beds?: number; occupancy?: number; blocks?: number }) {
  const PLATE_H = 74
  const W = 208
  const D = 148
  const total = (floors - 1) * PLATE_H

  const windowTones = ['', '', 'violet', '', 'warm', '', '', 'off', '', 'violet', '', '', 'off', '', '']

  return (
    <div className="iso-stage" aria-hidden="true">
      <div className="iso-glow" />
      <div className="iso-scene" style={{ ['--iso-scale' as string]: scale, width: W, height: D }}>
        <div className="iso-ground" />

        {/* Corner columns give the stack a real vertical volume */}
        {[
          { left: 0, top: 0 }, { left: W, top: 0 },
          { left: 0, top: D }, { left: W, top: D },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', left: p.left - 3, top: p.top - 3, width: 6, height: total + 26,
              transformOrigin: '0 0', transform: 'rotateX(90deg)',
              background: 'linear-gradient(180deg, rgba(34,211,238,0.85), rgba(139,92,246,0.35))',
              borderRadius: 3, boxShadow: '0 0 14px rgba(34,211,238,0.55)',
            }}
          />
        ))}

        {/* Stacked floor plates */}
        {Array.from({ length: floors }).map((_, f) => (
          <div
            key={f}
            className="iso-slab"
            style={{
              transform: `translateZ(${f * PLATE_H}px)`,
              background: f === floors - 1
                ? 'linear-gradient(140deg, rgba(84,100,180,0.98), rgba(34,44,100,0.98))'
                : 'linear-gradient(140deg, rgba(44,56,120,0.97), rgba(18,25,64,0.97))',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 6, padding: 10, height: '100%' }}>
              {windowTones.map((tone, w) => (
                <div
                  key={w}
                  className={`iso-win ${tone}`}
                  style={{ animationDelay: `${(f * 0.28 + w * 0.11).toFixed(2)}s` }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Roof gear: solar panel array */}
        <div className="iso-slab" style={{ transform: `translateZ(${total + PLATE_H}px)`, background: 'linear-gradient(140deg, rgba(96,112,196,0.98), rgba(40,52,112,0.98))' }}>
          <div className="iso-stack">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="iso-panel" style={{ animation: `windowGlow ${3 + i * 0.3}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>

        {/* Rooftop stair-head block */}
        <div
          className="iso-slab"
          style={{
            width: 62, height: 46, transform: `translateZ(${total + PLATE_H + 26}px) translate(72px, 51px)`,
            background: 'linear-gradient(140deg, rgba(120,138,224,0.98), rgba(52,64,132,0.98))',
          }}
        />
      </div>

      <div className="iso-float a" style={{ pointerEvents: 'none' }}>
        <span className="pin">B</span> {beds ?? 126} beds tracked live
      </div>
      <div className="iso-float b" style={{ pointerEvents: 'none' }}>
        <span className="pin" style={{ background: 'var(--grad-2)' }}>%</span> Occupancy {occupancy ?? 78}% · {blocks ?? 3} blocks
      </div>
      <div className="iso-float c" style={{ pointerEvents: 'none' }}>
        <span className="pin" style={{ background: 'linear-gradient(120deg,#22d3ee,#3b82f6)' }}>❄</span> AC &amp; Non-AC floors
      </div>
      <div className="iso-float d" style={{ pointerEvents: 'none' }}>
        <span className="pin" style={{ background: 'linear-gradient(120deg,#a855f7,#ec4899)' }}>✓</span> Live bed status
      </div>
    </div>
  )
}

/** Compact single-floor preview card (used on the Home and Mess pages). */
export function IsoMini({ label, value, tone = '#22d3ee' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <span style={{ width: 10, height: 34, borderRadius: 4, background: tone, boxShadow: `0 0 16px ${tone}`, flex: 'none' }} />
      <div>
        <div className="tiny muted">{label}</div>
        <b>{value}</b>
      </div>
    </div>
  )
}
