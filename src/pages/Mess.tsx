import React, { useMemo, useState } from 'react'
import {
  COLLEGE_TIMING, GYM_TIMING, HOLIDAY_MENU, MESS_TIMINGS, MESS_WEEK, MessDay, todayDayName, todayLong,
} from '../data/mock'
import { Icon } from '../lib/icons'
import { Button, Field, Rating, SectionHead, StatCard, Tabs } from '../lib/ui'
import { useApp } from '../lib/store'

export function Mess() {
  const { toast } = useApp()
  const todayName = todayDayName()
  const [day, setDay] = useState<string>(MESS_WEEK.some((d) => d.day === todayName) ? todayName : 'Monday')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch')
  const [error, setError] = useState('')

  const selected: MessDay = useMemo(() => MESS_WEEK.find((d) => d.day === day) ?? MESS_WEEK[0], [day])
  const today = MESS_WEEK.find((d) => d.day === todayName) ?? MESS_WEEK[0]

  const currentMealKey = useMemo(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60
    if (h < 10) return 'breakfast'
    if (h < 15) return 'lunch'
    if (h < 18.5) return 'snacks'
    return 'dinner'
  }, [])

  const submitFeedback = () => {
    if (!rating) { setError('Please pick a star rating before submitting.'); return }
    if (feedback.trim().length < 8) { setError('Please describe your feedback in at least 8 characters so the mess committee can act on it.'); return }
    setError('')
    toast('success', 'Feedback submitted', `Your ${rating}-star rating for ${meal} on ${day} reached the mess committee.`)
    setRating(0)
    setFeedback('')
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Mess & dining"
        title="Everything on the plate, nothing on the notice board"
        sub={`Today is ${todayLong()}. Menus are published a week in advance, timings are enforced, and every meal can be rated straight to the mess committee.`}
        right={<span className="chip-tag cyan"><Icon name="clock" size={12} /> Live timings · updated today</span>}
      />

      {/* Timings strip */}
      <div className="grid g4 stagger" style={{ marginBottom: 26 }}>
        {MESS_TIMINGS.map((t) => {
          const isNow = t.key === currentMealKey
          return (
            <div key={t.key} className={`stat ${isNow ? 'glowing' : ''}`} style={{ borderColor: isNow ? 'rgba(34,211,238,0.5)' : undefined }}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                {isNow && <span className="badge available"><i className="dot" />Serving now</span>}
              </div>
              <div className="stat-num" style={{ fontSize: '1.35rem' }}>{t.open} – {t.close}</div>
              <div className="stat-label">{t.label}</div>
            </div>
          )
        })}
      </div>

      {/* Today's menu */}
      <div className="card pad-lg" style={{ marginBottom: 26 }}>
        <div className="row-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="kicker-num">Today's menu · {todayName}</div>
            <h3 style={{ marginTop: 8, marginBottom: 0 }}>Four meals, freshly cooked on campus</h3>
          </div>
          {today.special && <span className="chip-tag violet"><Icon name="sparkle" size={12} /> {today.special}</span>}
        </div>

        <div className="grid g4">
          {today.meals.map((m) => (
            <div className={`card tight meal-card ${m.key === currentMealKey ? 'glowing' : ''}`} key={m.key}>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <span className="meal-ico">{m.icon}</span>
                <span className="tiny muted">{m.open}–{m.close}</span>
              </div>
              <b style={{ display: 'block', marginBottom: 10 }}>{m.name}</b>
              <ul className="menu-list">
                {m.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly menu */}
      <div className="card pad-lg" style={{ marginBottom: 26 }}>
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title"><Icon name="calendar" size={17} /> Weekly menu rotation</div>
          <Tabs
            ariaLabel="Select day of week"
            tabs={MESS_WEEK.map((d) => ({ id: d.day, label: d.short }))}
            value={day}
            onChange={setDay}
          />
        </div>

        <div className="grid g4">
          {selected.meals.map((m) => (
            <div className="card tight" key={m.key}>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                <span className="meal-ico" style={{ width: 34, height: 34, fontSize: '1rem' }}>{m.icon}</span>
                <div>
                  <b className="small">{m.name}</b>
                  <div className="tiny muted">{m.open} – {m.close}</div>
                </div>
              </div>
              <ul className="menu-list">{m.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
        {selected.special && <p className="small" style={{ color: 'var(--cyan)', marginTop: 16, marginBottom: 0 }}><Icon name="sparkle" size={14} style={{ verticalAlign: '-2px' }} /> {selected.special}</p>}
      </div>

      <div className="grid g2" style={{ marginBottom: 26 }}>
        {/* Holiday / special menu */}
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 14 }}><Icon name="star" size={17} /> Special & holiday menu</div>
          <span className="chip-tag violet" style={{ marginBottom: 14, display: 'inline-flex' }}>{HOLIDAY_MENU.occasion}</span>
          <div className="col" style={{ gap: 12 }}>
            {HOLIDAY_MENU.meals.map((m) => (
              <div key={m.name} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span className="meal-ico" style={{ width: 36, height: 36, fontSize: '1rem', flex: 'none' }}>{m.icon}</span>
                <div className="grow">
                  <div className="row-between">
                    <b className="small">{m.name}</b>
                    <span className="tiny muted">{m.time}</span>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{m.items.join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 14 }}><Icon name="star" size={17} /> Meal feedback & rating</div>

          <div className="grid g2" style={{ gap: 14, marginBottom: 14 }}>
            <Field label="Meal" id="fb-meal">
              <select id="fb-meal" className="select" value={meal} onChange={(e) => setMeal(e.target.value as typeof meal)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="snacks">Snacks & Tea</option>
                <option value="dinner">Dinner</option>
              </select>
            </Field>
            <Field label="Day" id="fb-day">
              <select id="fb-day" className="select" value={day} onChange={(e) => setDay(e.target.value)}>
                {MESS_WEEK.map((d) => <option key={d.day} value={d.day}>{d.day}</option>)}
              </select>
            </Field>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Your rating</label>
            <Rating value={rating} onChange={setRating} />
          </div>

          <Field label="Comments for the mess committee" id="fb-comment" error={error || undefined}>
            <textarea
              id="fb-comment" className="textarea" value={feedback} maxLength={400}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. The paneer gravy was excellent today, but the roti counter ran out by 20:15."
            />
          </Field>

          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <Button variant="primary" icon="check" onClick={submitFeedback}>Submit feedback</Button>
          </div>
          {error && <p className="tiny" style={{ color: 'var(--danger)', marginTop: 8, marginBottom: 0 }} role="alert">{error}</p>}
        </div>
      </div>

      {/* Daily schedule */}
      <div className="grid g3">
        <StatCard label="Gym timings" value={`${GYM_TIMING.open} – ${GYM_TIMING.close}`} icon="zap" foot={GYM_TIMING.note} />
        <StatCard label="Class hours" value={COLLEGE_TIMING.classes} icon="clock" foot={`Library ${COLLEGE_TIMING.library} · Labs timings ${COLLEGE_TIMING.labs}`} />
        <StatCard label="Mess capacity" value="420 seats" icon="utensils" foot="Two sittings at lunch · token-free entry with ID" tone="info" />
      </div>
    </div>
  )
}
