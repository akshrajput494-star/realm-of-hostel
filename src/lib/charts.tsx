import React from 'react'

/* -------------------------------------------------------------------------
   Hand-rolled SVG charts — crisp, dependency-free and fully themeable.
   Every chart is responsive (viewBox + width:100%) and animates on mount.
   ------------------------------------------------------------------------- */

export const PALETTE = ['#8b5cf6', '#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#e879f9', '#94a3b8']

export interface Slice { label: string; value: number; color?: string }

export function DonutChart({
  data, size = 190, thickness = 22, centerLabel, centerValue,
}: { data: Slice[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="row" style={{ gap: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(147,168,255,0.12)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const len = (d.value / total) * c
            const el = (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color ?? PALETTE[i % PALETTE.length]} strokeWidth={thickness} strokeLinecap="round"
                strokeDasharray={`${Math.max(len - 3, 0)} ${c - Math.max(len - 3, 0)}`}
                strokeDashoffset={-offset}
                style={{ animation: `fadeIn 0.8s var(--ease) ${i * 0.12}s both`, filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.4))' }}
              />
            )
            offset += len
            return el
          })}
        </g>
        {(centerValue || centerLabel) && (
          <>
            <text x="50%" y="47%" textAnchor="middle" fill="#eaf0ff" fontSize={size * 0.17} fontWeight="800" letterSpacing="-0.02em">
              {centerValue}
            </text>
            <text x="50%" y="61%" textAnchor="middle" fill="#8d99c0" fontSize={size * 0.072} fontWeight="700" letterSpacing="0.1em">
              {centerLabel?.toUpperCase()}
            </text>
          </>
        )}
      </svg>
      <div className="col" style={{ gap: 9, minWidth: 150 }}>
        {data.map((d, i) => (
          <div key={d.label} className="row" style={{ gap: 10, fontSize: '0.84rem' }}>
            <i style={{ width: 11, height: 11, borderRadius: 4, background: d.color ?? PALETTE[i % PALETTE.length], boxShadow: `0 0 10px ${d.color ?? PALETTE[i % PALETTE.length]}` }} />
            <span style={{ color: 'var(--text-2)' }}>{d.label}</span>
            <span className="spacer" />
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarChart({
  data, height = 190, colors, suffix = '', horizontal = false, maxOverride,
}: { data: Slice[]; height?: number; colors?: string[]; suffix?: string; horizontal?: boolean; maxOverride?: number }) {
  const max = maxOverride ?? Math.max(...data.map((d) => d.value), 1)

  if (horizontal) {
    return (
      <div className="col" style={{ gap: 13 }}>
        {data.map((d, i) => (
          <div key={d.label}>
            <div className="row-between" style={{ fontSize: '0.82rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-2)' }}>{d.label}</span>
              <b>{d.value.toLocaleString('en-IN')}{suffix}</b>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: colors?.[i] ?? `linear-gradient(90deg, var(--violet), var(--cyan))`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const w = 100
  const gap = 100 / data.length
  const barW = gap * 0.52

  return (
    <svg viewBox={`0 0 ${w} 100`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Bar chart" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <line key={g} x1="0" x2={w} y1={g} y2={g} stroke="rgba(147,168,255,0.11)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * 92
        const x = i * gap + (gap - barW) / 2
        return (
          <g key={d.label}>
            <rect
              x={x} y={100 - h} width={barW} height={h} rx="1.4"
              fill={colors?.[i] ?? 'url(#barGrad)'}
              style={{ transformOrigin: `50% 100px`, animation: `barGrow 0.75s var(--ease) ${i * 0.07}s both` }}
            />
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({
  points, height = 180, color = '#22d3ee', area = true, suffix = '',
}: { points: { label: string; value: number }[]; height?: number; color?: string; area?: boolean; suffix?: string }) {
  const max = Math.max(...points.map((p) => p.value), 1)
  const min = Math.min(...points.map((p) => p.value), 0)
  const span = max - min || 1
  const w = 300
  const h = 100
  const step = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((p, i) => [i * step, h - ((p.value - min) / span) * (h - 18) - 9] as const)
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${path} L${w},${h} L0,${h} Z`
  const uid = React.useId().replace(/:/g, '')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={`ln-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 33, 66, 99].map((g) => (
        <line key={g} x1="0" x2={w} y1={g} y2={g} stroke="rgba(147,168,255,0.11)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      ))}
      {area && <path d={areaPath} fill={`url(#ln-${uid})`} />}
      <path
        d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 900, strokeDashoffset: 900, animation: 'dash 1.4s var(--ease) 0.15s forwards' }}
      />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="#0b1130" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

export function ProgressRing({
  pct, size = 92, thickness = 9, label, color = '#22d3ee',
}: { pct: number; size?: number; thickness?: number; label?: string; color?: string }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const uid = React.useId().replace(/:/g, '')
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? 'Progress'}: ${pct}%`}>
        <defs>
          <linearGradient id={`pr-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(147,168,255,0.14)" strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#pr-${uid})`} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(pct, 100)) / 100}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s var(--ease)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <b style={{ fontSize: size * 0.24, display: 'block', lineHeight: 1 }}>{pct}%</b>
          {label && <span style={{ fontSize: size * 0.11, color: 'var(--muted)', letterSpacing: '0.08em' }}>{label}</span>}
        </div>
      </div>
    </div>
  )
}

/** Stacked bed-availability bar used across dashboards. */
export function StackedBar({ parts, height = 12 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div>
      <div style={{ display: 'flex', height, borderRadius: 999, overflow: 'hidden', background: 'rgba(147,168,255,0.12)' }}>
        {parts.map((p) => (
          <div
            key={p.label} title={`${p.label}: ${p.value}`}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color, transition: 'width 0.9s var(--ease)' }}
          />
        ))}
      </div>
      <div className="chart-legend">
        {parts.map((p) => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label} · <b>{p.value}</b></span>
        ))}
      </div>
    </div>
  )
}

/** Tiny inline sparkline for stat cards. */
export function Spark({ values, color = '#22d3ee', width = 90, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  )
}
