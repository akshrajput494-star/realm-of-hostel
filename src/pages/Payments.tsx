import React, { useMemo, useState } from 'react'
import { Payment, STUDENTS, amountsFor, getRoom, rupee } from '../data/mock'
import { Icon } from '../lib/icons'
import { Button, EmptyState, Field, Modal, Progress, SectionHead, StatCard, Tabs } from '../lib/ui'
import { useApp } from '../lib/store'
import { LinkButton } from '../lib/ui'

const DUE_DATE = '30 September 2026'
const MODES = ['UPI · GPay', 'UPI · PhonePe', 'Net Banking', 'Debit Card', 'Pay at Hostel Office']

export function Payments() {
  const { user, payments, payNow, toast } = useApp()
  const isStaff = user?.role === 'admin' || user?.role === 'warden'

  const student = STUDENTS.find((s) => s.id === user?.studentId)
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState(MODES[0])
  const [error, setError] = useState('')
  const [lastReceipt, setLastReceipt] = useState<Payment | null>(null)

  const ledger = useMemo(() => {
    const list = scope === 'all' && isStaff ? payments : payments.filter((p) => p.studentId === (user?.studentId ?? '__none__'))
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, scope, isStaff, user])

  const balance = useMemo(() => (student ? amountsFor(student, payments) : null), [student, payments])
  const total = student?.feeTotal ?? 27350
  const paid = balance?.paid ?? 0
  const pending = balance?.pending ?? 0
  const room = student ? getRoom(student.roomId) : undefined

  const dueSoon = new Date('2026-09-30').getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(dueSoon / 86400000))

  const canPay = !!student

  const submitPayment = () => {
    if (!canPay) {
      setError('Sign in with a demo student account to make a payment against your own ledger.')
      return
    }
    const value = Number(amount.replace(/[^0-9]/g, ''))
    if (!value || value < 100) { setError('Enter an amount of at least ₹100.'); return }
    if (value > pending) { setError(`Pending amount is ${rupee(pending)}. Enter an amount up to that limit.`); return }
    setError('')
    const receipt = payNow(value, mode, student ? 'Odd Semester 2026-27' : 'Guest payment')
    setLastReceipt(receipt)
    setOpen(false)
    setAmount('')
  }

  return (
    <div className="page-enter wrap section">
      <SectionHead
        eyebrow="Fees & payments"
        title="Your hostel fee ledger"
        sub="One clear view of what you owe, what you have paid and when it is due — with receipt status for every transaction. Demo build: no real gateway is connected."
        right={
          isStaff ? (
            <Tabs
              ariaLabel="Payment scope"
              tabs={[{ id: 'mine', label: 'My ledger' }, { id: 'all', label: 'All students', count: payments.length }]}
              value={scope}
              onChange={setScope}
            />
          ) : <span className="chip-tag cyan"><Icon name="shield" size={12} /> Secured sandbox · demo data only</span>
        }
      />

      {!student && !isStaff && (
        <div className="notice-strip" style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} />
          <span className="small">
            You are viewing the public fee structure. <b>Sign in as student@roh.demo</b> to see your personal ledger, dues and receipts.
          </span>
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <StatCard label="Total hostel fee" value={rupee(total)} icon="wallet" foot="Semester fee + refundable deposit" />
        <StatCard label="Paid amount" value={rupee(paid)} tone="ok" icon="check" foot={`${ledger.filter((p) => p.status === 'Paid').length} successful transactions`} />
        <StatCard label="Pending amount" value={rupee(pending)} tone={pending > 0 ? 'danger' : 'ok'} icon="alert" foot={pending > 0 ? `Due ${DUE_DATE}` : 'All dues cleared'} />
        <StatCard label="Days to due date" value={daysLeft} tone={daysLeft < 20 ? 'warn' : 'info'} icon="calendar" foot={`Late fee ₹250 per week after ${DUE_DATE}`} />
      </div>

      <div className="split-wide" style={{ marginBottom: 26 }}>
        {/* Summary + pay */}
        <div className="card pad-lg">
          <div className="card-title" style={{ marginBottom: 16 }}><Icon name="wallet" size={17} /> Current semester summary</div>

          <Progress
            pct={total ? (paid / total) * 100 : 0}
            tone="ok"
            label={`Paid ${rupee(paid)} of ${rupee(total)}`}
          />

          <div className="divider" />

          <div className="grid g2" style={{ gap: 16 }}>
            <div className="kv">
              <div className="kv-row"><span>Term</span><span>Odd Semester 2026-27</span></div>
              <div className="kv-row"><span>Hostel</span><span>{room?.hostelId === 'H2' ? 'Kalpana Girls Hostel' : 'Aryabhatta Boys Hostel'}</span></div>
              <div className="kv-row"><span>Room</span><span>{room?.number ?? '—'}</span></div>
              <div className="kv-row"><span>Room type</span><span>{room ? `${room.type} · ${room.seater}-seater` : '—'}</span></div>
            </div>
            <div className="kv">
              <div className="kv-row"><span>Monthly rent</span><span>{room ? rupee(room.monthlyFee) : '—'}</span></div>
              <div className="kv-row"><span>Semester rent (6 months)</span><span>{room ? rupee(room.semesterFee) : '—'}</span></div>
              <div className="kv-row"><span>Security deposit</span><span>{room ? rupee(room.securityDeposit) : '—'}</span></div>
              <div className="kv-row"><span>Mess charges</span><span>Included</span></div>
            </div>
          </div>

          <div className="divider" />

          <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="tiny muted">Amount payable now</div>
              <div className="fee-m">{rupee(pending)}</div>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <Button
                variant="ghost" icon="printer"
                onClick={() => toast('info', 'Statement queued', 'Your consolidated fee statement will be emailed by the accounts desk (demo).')}
              >
                Statement
              </Button>
              <Button
                variant="primary" icon="wallet" disabled={pending <= 0 || !canPay}
                onClick={() => { setOpen(true); setAmount(String(pending)) }}
                title={!canPay
                  ? 'Sign in as a student to pay against your own ledger'
                  : pending > 0 ? 'Pay pending amount (demo)' : 'Nothing pending'}
              >
                {!canPay ? 'Sign in to pay' : pending > 0 ? 'Pay Now' : 'Fully paid'}
              </Button>
            </div>
          </div>

          {lastReceipt && (
            <div className="notice-strip anim-up" style={{ marginTop: 18, borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.1)' }}>
              <Icon name="check" size={16} />
              <span className="small">
                Payment of <b>{rupee(lastReceipt.amount)}</b> recorded. Receipt <b className="mono">{lastReceipt.receipt}</b> is available below.
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}><Icon name="info" size={16} /> How payments work</div>
          <ul className="perm-list">
            <li><Icon name="check" size={14} /> Fees are accepted through the campus ERP and hostel counter.</li>
            <li><Icon name="check" size={14} /> Every transaction generates a receipt with a unique number.</li>
            <li><Icon name="check" size={14} /> The refundable deposit is returned after no-dues clearance.</li>
            <li><Icon name="check" size={14} /> Instalment requests are raised with the warden before the due date.</li>
          </ul>
          <div className="divider" />
          <p className="tiny dim" style={{ margin: 0 }}>
            This is a hackathon demo. “Pay Now” simulates a gateway response locally — no card details are
            collected, stored or transmitted.
          </p>
        </div>
      </div>

      {/* History */}
      <div className="card pad-lg">
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}><Icon name="clipboard" size={17} /> Payment history & receipt status</div>
          <span className="chip-tag">{ledger.length} records</span>
        </div>

        {ledger.length === 0 ? (
          <EmptyState
            icon="wallet"
            title={student || isStaff ? 'No transactions yet' : 'Sign in to view your ledger'}
            message={student || isStaff
              ? 'Once a payment is recorded it will appear here with its receipt number and status.'
              : 'Personal payment records are private. Sign in with a demo student account to see your ledger, receipts and “Pay Now”.'}
            action={!student && !isStaff ? <LinkButton to="/login?demo=1" variant="primary" icon="key">Demo Login</LinkButton> : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Receipt</th>
                  {scope === 'all' && <th>Student</th>}
                  <th>Term</th><th>Date</th><th>Mode</th><th>Amount</th><th>Status</th><th>Receipt status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((p) => {
                  const owner = STUDENTS.find((s) => s.id === p.studentId)
                  return (
                    <tr key={p.id}>
                      <td className="mono tiny">{p.receipt}</td>
                      {scope === 'all' && <td>{owner?.name ?? '—'}</td>}
                      <td>{p.term}</td>
                      <td>{new Date(p.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td>{p.mode}</td>
                      <td><b>{rupee(p.amount)}</b></td>
                      <td>
                        <span className={`badge ${p.status === 'Paid' ? 'resolved' : p.status === 'Pending' ? 'pending' : 'full'}`}>
                          <i className="dot" />{p.status}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="xs" variant="ghost" icon="download"
                          disabled={p.status !== 'Paid'}
                          onClick={() => toast('success', 'Receipt ready', `${p.receipt}.pdf generated for ${rupee(p.amount)} (demo download).`)}
                        >
                          {p.status === 'Paid' ? 'Download' : 'Awaiting'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setError('') }}
        size="sm"
        title="Confirm demo payment"
        subtitle="No real gateway is connected. This simulates a successful transaction."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); setError('') }}>Cancel</Button>
            <Button variant="primary" icon="wallet" onClick={submitPayment}>
              Confirm payment{amount ? ` · ${rupee(Number(amount.replace(/[^0-9]/g, '')) || 0)}` : ''}
            </Button>
          </>
        }
      >
        <div className="col" style={{ gap: 16 }}>
          <div className="card tight">
            <div className="row-between">
              <span className="small muted">Pending amount</span>
              <b>{rupee(pending)}</b>
            </div>
            <div className="row-between" style={{ marginTop: 6 }}>
              <span className="small muted">Due date</span>
              <b>{DUE_DATE}</b>
            </div>
          </div>

          <Field label="Amount to pay (₹)" id="pay-amount" error={error || undefined}>
            <input
              id="pay-amount" className="input" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="20000"
            />
          </Field>

          <Field label="Payment mode" id="pay-mode">
            <select id="pay-mode" className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[pending, 5000, 10000].filter((v) => v > 0).map((v) => (
              <button key={v} className="chip" onClick={() => setAmount(String(Math.min(v, pending)))}>Pay {rupee(Math.min(v, pending))}</button>
            ))}
          </div>

          <p className="tiny dim" style={{ margin: 0 }}>
            By continuing you agree to the demo terms. No payment instrument is charged.
          </p>
        </div>
      </Modal>
    </div>
  )
}
