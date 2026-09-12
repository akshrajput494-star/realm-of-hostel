import React, { useMemo, useState } from 'react'
import { COLLEGE_TIMING, TRANSPORT_ROUTES, TransportRoute, rupee } from '../data/mock'
import { Icon } from '../lib/icons'
import { Button, EmptyState, Progress, SectionHead, StatCard, Tabs } from '../lib/ui'
import { useApp } from '../lib/store'

const statusTone: Record<TransportRoute['status'], string> = {
  'On Time': 'available',
  Delayed: 'pending',
  Departed: 'full',
  Scheduled: 'reserved',
  Cancelled: 'maintenance',
}

export function Transport() {
  const { toast } = useApp()
  const [statusFilter, setStatusFilter] = useState<'all' | TransportRoute['status']>('all')
  const [expanded, setExpanded] = useState<string | null>(TRANSPORT_ROUTES[0].id)
  const [booked, setBooked] = useState<Record<string, boolean>>({})

  const routes = useMemo(
    () => TRANSPORT_ROUTES.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [statusFilter],
  )

  const nextBus = useMemo(() => {
    const running = TRANSPORT_ROUTES.filter((r) => r.status !== 'Cancelled')
    return running.sort((a, b) => a.nextAt.localeCompare(b.nextAt))[0]
  }, [])

  const totalSeats = TRANSPORT_ROUTES.reduce((a, r) => a + r.seats, 0)
  const totalBooked = TRANSPORT_ROUTES.reduce((a, r) => a + r.booked, 0)

  const reserve = (r: TransportRoute) => {
    if (r.booked >= r.seats) {
      toast('error', 'Bus is full', `${r.route} has no seats left. Please check the next available bus.`)
      return
    }
    setBooked((b) => ({ ...b, [r.id]: true }))
    toast('success', 'Seat reserved (demo)', `Seat confirmed on ${r.busNo} for the ${r.nextAt} departure.`)
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Campus transport"
        title="Bus routes, pickup points and timings"
        sub={`College hours run ${COLLEGE_TIMING.classes}. Five routes connect the hostels, academic block, library and city market — with live seat counts.`}
        right={
          <Tabs
            ariaLabel="Filter routes by status"
            tabs={[
              { id: 'all', label: 'All routes', count: TRANSPORT_ROUTES.length },
              { id: 'On Time', label: 'On time' },
              { id: 'Delayed', label: 'Delayed' },
              { id: 'Scheduled', label: 'Scheduled' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />

      <div className="grid g4" style={{ marginBottom: 26 }}>
        <StatCard label="Active routes" value={TRANSPORT_ROUTES.length} icon="bus" foot="Fleet maintained by the transport office" />
        <StatCard label="Next bus out" value={nextBus.nextAt} icon="clock" tone="info" foot={`${nextBus.busNo} · ${nextBus.status}`} />
        <StatCard label="Seats available now" value={totalSeats - totalBooked} icon="users" tone="ok" foot={`${totalBooked} of ${totalSeats} seats booked`} />
        <StatCard label="College hours" value={COLLEGE_TIMING.classes} icon="calendar" foot={`Evening return trips from ${COLLEGE_TIMING.labs.slice(0, 5)}`} />
      </div>

      {/* Next bus highlight */}
      <div className="glass glowing pad-lg" style={{ marginBottom: 26, padding: 22 }}>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="row" style={{ gap: 16 }}>
            <span style={{ width: 54, height: 54, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'linear-gradient(140deg, rgba(34,211,238,0.28), rgba(139,92,246,0.24))', border: '1px solid rgba(147,168,255,0.3)', color: 'var(--cyan)', flex: 'none' }}>
              <Icon name="bus" size={26} />
            </span>
            <div>
              <div className="kicker-num">Next available bus</div>
              <h3 style={{ margin: '6px 0 4px' }}>{nextBus.busNo} · departs {nextBus.nextAt}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {nextBus.route} · Driver {nextBus.driver} · {nextBus.seats - nextBus.booked} seats free
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="badge available"><i className="dot" />{nextBus.status}</span>
            <Button variant="primary" icon="check" onClick={() => reserve(nextBus)}>Reserve a seat</Button>
          </div>
        </div>
      </div>

      {routes.length === 0 ? (
        <EmptyState
          icon="bus" title="No routes match that status"
          message="Every route is running normally except where noted. Try selecting “All routes”."
          action={<Button variant="primary" icon="refresh" onClick={() => setStatusFilter('all')}>Show all routes</Button>}
        />
      ) : (
        <div className="col" style={{ gap: 16 }}>
          {routes.map((r) => {
            const open = expanded === r.id
            const free = r.seats - r.booked
            const pct = Math.round((r.booked / r.seats) * 100)
            return (
              <div className="card" key={r.id}>
                <div className="row-between" style={{ gap: 14, flexWrap: 'wrap' }}>
                  <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(147,168,255,0.1)', border: '1px solid var(--stroke)', color: 'var(--blue-2)', flex: 'none' }}>
                      <Icon name="bus" size={22} />
                    </span>
                    <div>
                      <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                        <b>{r.route}</b>
                        <span className={`badge ${statusTone[r.status]}`}><i className="dot" />{r.status}</span>
                      </div>
                      <div className="small muted" style={{ marginTop: 5 }}>
                        Bus {r.busNo} · Driver {r.driver} · {r.driverPhone}
                      </div>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
                    <div className="center">
                      <div className="tiny muted">Departs</div>
                      <b>{r.stops[0].depart}</b>
                    </div>
                    <div className="center">
                      <div className="tiny muted">Arrives</div>
                      <b>{r.stops[r.stops.length - 1].arrive === '—' ? r.stops[r.stops.length - 1].depart : r.stops[r.stops.length - 1].arrive}</b>
                    </div>
                    <div className="center">
                      <div className="tiny muted">Seats free</div>
                      <b style={{ color: free > 5 ? 'var(--ok)' : 'var(--warn)' }}>{free}</b>
                    </div>
                    <Button variant="ghost" size="sm" icon={open ? 'chevronDown' : 'chevronRight'} onClick={() => setExpanded(open ? null : r.id)}>
                      {open ? 'Hide stops' : 'View stops'}
                    </Button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Progress pct={pct} tone={pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'ok'} label={`Seat occupancy · ${r.booked}/${r.seats} booked`} />
                </div>

                {open && (
                  <div className="anim-up" style={{ marginTop: 20 }}>
                    <div className="route-line" />
                    <div className="grid g4" style={{ gap: 12 }}>
                      {r.stops.map((s, i) => (
                        <div className="card tight" key={s.point}>
                          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                            <span className="pin">{i + 1}</span>
                            <b className="tiny" style={{ letterSpacing: '0.02em' }}>{s.point}</b>
                          </div>
                          <div className="row tiny muted" style={{ gap: 10 }}>
                            <span>Dep <b style={{ color: 'var(--text-2)' }}>{s.depart}</b></span>
                            <span>Arr <b style={{ color: 'var(--text-2)' }}>{s.arrive}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="row" style={{ justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                        <span className="chip-tag cyan">College in: {r.collegeIn}</span>
                        <span className="chip-tag violet">College out: {r.collegeOut}</span>
                        <span className="chip-tag blue">Pickup: {r.stops[0].point}</span>
                      </div>
                      <Button
                        variant={booked[r.id] ? 'ghost' : 'primary'} size="sm" icon={booked[r.id] ? 'check' : 'plus'}
                        disabled={booked[r.id]} onClick={() => reserve(r)}
                      >
                        {booked[r.id] ? 'Seat reserved' : free > 0 ? 'Reserve a seat' : 'Bus full'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Compiled timetable */}
      <div className="card pad-lg" style={{ marginTop: 26 }}>
        <div className="card-title" style={{ marginBottom: 14 }}><Icon name="calendar" size={17} /> Consolidated timetable</div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Route</th><th>Bus no.</th><th>Pickup point</th><th>Departure</th><th>Arrival</th>
                <th>Seats</th><th>Status</th><th>Next bus</th>
              </tr>
            </thead>
            <tbody>
              {TRANSPORT_ROUTES.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 620 }}>{r.route}</td>
                  <td className="mono tiny">{r.busNo}</td>
                  <td>{r.stops[0].point}</td>
                  <td>{r.stops[0].depart}</td>
                  <td>{r.stops[r.stops.length - 1].arrive}</td>
                  <td>{r.seats - r.booked}/{r.seats}</td>
                  <td><span className={`badge ${statusTone[r.status]}`}><i className="dot" />{r.status}</span></td>
                  <td><b>{r.nextAt}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny dim" style={{ marginTop: 12, marginBottom: 0 }}>
          Fares are included in the hostel fee for residents. Guest passes cost {rupee(40)} per trip and are issued at the transport office.
        </p>
      </div>
    </div>
  )
}
