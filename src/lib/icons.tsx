import React from 'react'

/* Single-source stroke icon set — keeps the bundle tiny and preview-safe
   (no external icon fonts or CDN requests). */
const P: Record<string, string[]> = {
  home: ['M3 10.6 12 3l9 7.6', 'M5.5 9.4V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.4'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3'],
  map: ['M9 3 3 5.5v16L9 19l6 2.5 6-2.5v-16L15 5.5 9 3Z', 'M9 3v16', 'M15 5.5v16'],
  utensils: ['M4 3v7a3 3 0 0 0 6 0V3', 'M7 10v11', 'M17 3c-2 2-2 5 0 7v11'],
  bus: ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9H4V6Z', 'M4 15h16v3H4z', 'M7 21v-3', 'M17 21v-3', 'M4 9h16'],
  alert: ['M12 3 2 20h20L12 3Z', 'M12 9v5', 'M12 17.5h.01'],
  wallet: ['M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z', 'M16 12.5h3', 'M3 9.5h18'],
  bell: ['M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z', 'M10 20a2 2 0 0 0 4 0'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
  users: ['M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16.5 5.6a3.4 3.4 0 0 1 0 6.6', 'M18 20a6.4 6.4 0 0 0-1.6-4.2'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['m5 13 4.5 4.5L19 7'],
  chevronRight: ['m9 6 6 6-6 6'],
  chevronLeft: ['m15 6-6 6 6 6'],
  chevronDown: ['m6 9 6 6 6-6'],
  filter: ['M3 5h18', 'M6 12h12', 'M10 19h4'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01'],
  heart: ['M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.6-7.5 10-7.5 10Z'],
  clipboard: ['M9 4h6v3H9z', 'M9 5.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-2', 'M9 12h6', 'M9 16h4'],
  plus: ['M12 5v14', 'M5 12h14'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 18l-5-6 5-6', 'M5 12h10'],
  shield: ['M12 3 4 6v6c0 5 3.4 7.8 8 9 4.6-1.2 8-4 8-9V6l-8-3Z', 'm9 12 2 2 4-4'],
  lock: ['M6 11V8a6 6 0 0 1 12 0v3', 'M5 11h14v10H5z'],
  snow: ['M12 3v18', 'M4 7.5l16 9', 'M20 7.5l-16 9'],
  bed: ['M3 8v11', 'M3 13h18v6', 'M21 19v-4a3 3 0 0 0-3-3h-8', 'M7 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  building: ['M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17', 'M15 9h4v12', 'M8 7h4', 'M8 11h4', 'M8 15h4', 'M2 21h20'],
  trending: ['m3 16 5.5-5.5 4 4L21 6', 'M15 6h6v6'],
  calendar: ['M4 6h16v15H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 2'],
  phone: ['M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z'],
  mail: ['M3 6h18v12H3z', 'm3 7 9 6 9-6'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
  zap: ['m13 3-8 10h6l-1 8 8-10h-6l1-8Z'],
  wifi: ['M3.5 9a13 13 0 0 1 17 0', 'M6.5 12.5a9 9 0 0 1 11 0', 'M9.5 16a4.5 4.5 0 0 1 5 0', 'M12 19.5h.01'],
  droplet: ['M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10Z'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z'],
  layers: ['m12 3 9 5-9 5-9-5 9-5Z', 'm3 13 9 5 9-5'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  printer: ['M6 9V3h12v6', 'M5 9h14a2 2 0 0 1 2 2v7h-4v3H7v-3H3v-7a2 2 0 0 1 2-2Z', 'M8 16h8'],
  download: ['M12 4v11', 'm7 11 5 5 5-5', 'M4 20h16'],
  arrowRight: ['M4 12h15', 'm13 6 6 6-6 6'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 5v6h-6'],
  camera: ['M4 8h3l1.5-2h7L17 8h3v11H4z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
  star: ['m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 4Z'],
  scale: ['M12 4v16', 'M7 7l-4 8h8L7 7Z', 'M17 7l-4 8h8l-4-8Z'],
  key: ['M15 8a4 4 0 1 1-3.9 5.1L4 20l-2-2 7.4-7.4A4 4 0 0 1 15 8Z', 'M16.5 7.5h.01'],
  activity: ['M3 12h4l3-8 4 16 3-8h4'],
  pie: ['M12 3v9h9a9 9 0 1 0-9-9Z', 'M12 12V3a9 9 0 0 1 9 9h-9Z'],
}

export type IconName = keyof typeof P

export function Icon({
  name, size = 18, strokeWidth = 1.9, className, style,
}: { name: IconName | string; size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  const paths = P[name as IconName] ?? P.info
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true" focusable="false"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

/** ROH brand mark — gradient building glyph. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20V8l8-4.5L20 8v12" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" opacity="0.95" />
        <path d="M9.5 20v-6h5v6" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M4 20h16" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  )
}
