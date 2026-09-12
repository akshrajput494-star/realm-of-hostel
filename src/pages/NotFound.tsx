import React from 'react'
import { Icon } from '../lib/icons'
import { LinkButton } from '../lib/ui'
import { Link } from '../lib/router'
import { NAV_ITEMS } from '../components/Nav'

export function NotFound({ path }: { path: string }) {
  return (
    <div className="page-enter wrap section">
      <div className="glass pad-lg" style={{ textAlign: 'center', padding: '48px 26px', maxWidth: 720, margin: '0 auto' }}>
        <div className="empty-ico" style={{ margin: '0 auto 18px' }}><Icon name="map" size={28} /></div>
        <div className="kicker-num">Error 404</div>
        <h2 style={{ margin: '10px 0 12px' }}>This corridor leads nowhere</h2>
        <p className="lead" style={{ margin: '0 auto 8px' }}>
          We could not find a page at <span className="mono" style={{ color: 'var(--cyan)' }}>{path}</span>.
          The room, notice or dashboard you were looking for may have moved.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <LinkButton to="/" variant="primary" icon="home">Back to Home</LinkButton>
          <LinkButton to="/rooms" variant="ghost" icon="bed">Explore Rooms</LinkButton>
          <LinkButton to="/map" variant="ghost" icon="layers">3D Hostel Map</LinkButton>
        </div>
      </div>

      <div className="grid g4" style={{ marginTop: 30 }}>
        {NAV_ITEMS.slice(1, 5).map((item) => (
          <Link key={item.to} to={item.to} className="card hoverable feature" style={{ color: 'inherit' }}>
            <div className="feature-ico"><Icon name={item.icon} size={21} /></div>
            <h3>{item.label}</h3>
            <p>Jump straight to this module.</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
