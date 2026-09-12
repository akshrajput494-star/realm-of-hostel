# Realm of Hostel (ROH)

**Your hostel. Your room. Your complete campus life.**

A smart hostel discovery & information-management web app for students, wardens, mess staff,
transport managers and administrators. Built for a hackathon: fully interactive, no backend
required, but structured so a real API can be dropped in behind one file.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build + local preview:

```bash
npm run build      # tsc -b && vite build  → dist/
npm run preview    # serves dist/ on :4173
```

There is also a dependency-free static server for the built app (used for the hosted demo):

```bash
node server.mjs    # http://localhost:8080  (PORT=…. to override)
```

## Demo accounts

Every account accepts **any password of 3+ characters**. The login screen has one-tap
"Demo login" buttons for each role.

| Role | Email | What they see |
| --- | --- | --- |
| Student | `student@roh.demo` | Rooms, complaints, payments, mess, attendance, transport, dashboard |
| Warden | `warden@roh.demo` | Room occupancy, student allocation, attendance, complaints, notices |
| Admin | `admin@roh.demo` | Full estate console — hostels → beds → payments → complaints → mess → transport |
| Mess Staff | `mess@roh.demo` | Mess menu + meal feedback only |
| Transport Manager | `transport@roh.demo` | Transport routes + schedules only |

---

## Feature map

| Route | Page | Highlights |
| --- | --- | --- |
| `/` | Home | Hero, animated stats, isometric hostel visual, 6 feature cards, "How ROH works", privacy note |
| `/rooms` | Explore Rooms | Search, 7 filter groups, 4 sorts, grid/list views, shortlist, compare up to 3 |
| `/rooms/:id` | Room details | Bed layout with per-bed status, fees, deposit, facilities, apply / shortlist / compare |
| `/map` | 3D Hostel Map | Isometric SVG floor plan, building + floor selectors, orbit/zoom, tooltips, status legend |
| `/mess` | Mess | Today's menu, weekly timetable, timings, special & holiday menu, star feedback |
| `/transport` | Transport | Routes, pickup points, timings, live seats, bus status, next departure |
| `/complaints` | Complaints | Submit (category/priority/attachment/room), history, 5-state tracking timeline |
| `/payments` | Payments | Total / paid / pending, due date, receipts, history, demo "Pay Now" |
| `/notices` | Notices | Pinned circulars, category filter, warden/admin composer |
| `/login` | Login / Signup | Role picker, demo logins, validation, role-based redirect |
| `/dashboard` | Role dashboard | Student, warden, admin, mess and transport dashboards |
| `/admin` | Admin console | 12 management sections + occupancy/complaint/fee/attendance charts |
| `/privacy`, `/terms` | Legal | Data-protection and usage terms |

### Privacy by design (a hard requirement)

The public site **never** exposes occupant name, college, year or contact details.

* `GET /rooms` returns bed *status* only — no student identity.
* Room details show `Occupied by a verified resident` to anonymous visitors.
* Occupant details render only for the assigned student, their warden, or an admin
  (`canViewPrivateDetails`), and roommate details only for verified residents of that room
  (`canViewRoommates`).
* Complaints and payments lists are filtered to the viewer's own records.
* No phone number, email or Aadhaar-style data appears in any public DOM node — asserted in tests.

---

## Architecture

```
src/
  main.tsx              app bootstrap
  App.tsx               route table + layout + role guards
  data/mock.ts          domain types + realistic demo dataset (2 hostels, 3 blocks, 12 floors,
                        36 rooms, ~127 beds, 40 students, receipts, tickets, notices)
  lib/
    api.ts              ← the backend seam. Swap `mockApi` for `createHttpApi(base, token)`
    store.tsx           React context: session, shortlist, compare, complaints, payments,
                        notices, toasts, confirm dialogs, privacy gates
    router.tsx          ~50-line hash router (Link, useRoute, useNavigate)
    ui.tsx              Button, Card, Modal, Drawer, Tabs, Field, Badge, Toast, Skeleton,
                        EmptyState, Progress, StatCard, ConfirmDialog
    charts.tsx          hand-rolled SVG donut / bar / line / ring / stacked-bar charts
    icons.tsx           single inline-SVG icon set (no icon dependency)
  components/           Nav (hamburger + bottom nav), RoomCard, RoomDetail, CompareTray,
                        IsoFloor (axonometric SVG plan), IsoScene (isometric block)
  pages/                one file per route (see table above)
  styles/global.css     design system: tokens, glassmorphism, gradients, glow, motion, a11y
tests/smoke.mjs         Playwright end-to-end smoke test (16 steps, 128 assertions)
```

### Design system

Dark navy canvas (`#070b1c`) with purple → electric blue → cyan accents, glass cards
(`backdrop-filter: blur`), gradient buttons, soft shadows, glowing borders, 16–24 px radii,
Inter-style system sans, and motion tuned with `prefers-reduced-motion` support.
Fully responsive: desktop, laptop, tablet, and a dedicated mobile layout (hamburger drawer +
bottom navigation bar). Zero horizontal overflow at 390 px, 768 px and 1440 px — asserted in tests.

**Stack:** React 18 · TypeScript (strict) · Vite 5 · hand-written modern CSS + SVG.
No UI kit, no chart library, no icon package — every visual is bespoke.

### Connecting a real backend

`src/lib/api.ts` defines the whole domain contract and ships two implementations:

```ts
export const api: RohApi = mockApi
// or
export const api = createHttpApi(import.meta.env.VITE_ROH_API_URL, () => localStorage.getItem('roh.token'))
```

The HTTP client already speaks the REST routes documented at the top of that file, including
the authorisation rules the server must enforce. Nothing else in the app needs to change.

### Persistence

Session, shortlist, applications, newly-raised complaints, payments and notices are persisted to
`localStorage` (key `roh.store.v1`) so a demo survives a refresh. "Reset demo data" in the
footer restores the seed dataset.

---

## Testing

```bash
npm run build
node server.mjs &            # or npm run preview
node tests/smoke.mjs         # 128 checks, ~80 s
```

The suite drives a real Chromium browser through the whole checklist: homepage → explore rooms →
search → AC/capacity filters → room details → bed availability → shortlist → 3D map (hover,
zoom, click-through to the detail panel) → mess → transport → complaint submission → payments →
student dashboard → admin dashboard → role dashboards → mobile/tablet/desktop responsive audit →
404 → link integrity → console/network health → privacy scan.

---

## Accessibility & polish

* Semantic landmarks, `aria-label`/`aria-current`, visible focus rings, `role="dialog"` +
  `aria-modal` with Escape-to-close and focus restoration.
* Keyboard operation of room blocks on the map (Tab + Enter/Space).
* Loading skeletons, empty states, inline form validation, toast notifications and
  confirmation dialogs before destructive actions.
* No dead links and no non-functional buttons: every control either acts or is disabled with a reason.

## Notes

* Payments are simulated — no gateway, no real money. Modes (UPI/GPay, UPI/PhonePe, Net Banking,
  Debit Card, Pay at Hostel Office) are demo options with the due date, late-fee rule (₹250/week)
  and minimum payment (₹100) modelled.
* All names, rooms, receipts and tickets are synthetic demo data.
