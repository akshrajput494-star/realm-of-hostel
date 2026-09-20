/* =========================================================================
   ROH — Domain types
   These interfaces mirror the shape a REST/GraphQL backend would return, so
   swapping mock data for live API calls only requires replacing the
   `services` functions in src/lib/store.tsx.
   ========================================================================= */

export type Role = 'student' | 'warden' | 'admin' | 'mess' | 'transport' | 'guest'

export type RoomType = 'AC' | 'Non-AC'
export type SeaterType = 3 | 4

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'
export type RoomStatus = 'available' | 'partial' | 'full' | 'reserved' | 'maintenance'
export type ComplaintStatus = 'pending' | 'assigned' | 'inprogress' | 'resolved' | 'reopened'
export type ComplaintCategory =
  | 'Cleaning' | 'Water' | 'Electricity' | 'Wi-Fi' | 'Mess' | 'Room Maintenance' | 'Security' | 'Other'
export type Priority = 'low' | 'medium' | 'high'

export interface Hostel {
  id: string
  name: string
  code: string
  campus: string
  warden: string
  contact: string
  totalRooms: number
  blocks: number
}

export interface Building {
  id: string
  hostelId: string
  name: string
  code: string
  floors: number
  floorsLabel: string
  yearBuilt: number
}

export interface Bed {
  id: string
  roomId: string
  label: string
  status: BedStatus
  /** Private: only exposed to the assigned student, warden and admin. */
  studentId?: string
}

export interface Room {
  id: string
  number: string
  hostelId: string
  buildingId: string
  floor: number
  type: RoomType
  seater: SeaterType
  beds: Bed[]
  monthlyFee: number
  semesterFee: number
  securityDeposit: number
  facilities: string[]
  maintenanceNote?: string
  reservedFor?: string
}

export interface Student {
  id: string
  name: string
  email: string
  rollNo: string
  course: string
  year: string
  phone: string
  guardian: string
  guardianPhone: string
  hostelId: string
  buildingId: string
  roomId: string
  bedId: string
  feePaid: number
  feeTotal: number
  attendancePct: number
  avatar: string
}

export interface ComplaintEvent {
  at: string
  label: string
  by: string
  note?: string
}

export interface Complaint {
  id: string
  ticket: string
  category: ComplaintCategory
  title: string
  description: string
  priority: Priority
  roomNumber: string
  raisedBy: string
  studentId: string
  createdAt: string
  status: ComplaintStatus
  assignedTo?: string
  imageName?: string
  timeline: ComplaintEvent[]
}

export interface Payment {
  id: string
  studentId: string
  receipt: string
  amount: number
  mode: string
  status: 'Paid' | 'Pending' | 'Failed'
  date: string
  term: string
}

export interface Notice {
  id: string
  title: string
  body: string
  category: 'General' | 'Maintenance' | 'Mess' | 'Fees' | 'Transport' | 'Event' | 'Safety'
  date: string
  pinned: boolean
  audience: string
  by: string
}

export interface RouteStop {
  point: string
  depart: string
  arrive: string
}

export interface TransportRoute {
  id: string
  busNo: string
  driver: string
  driverPhone: string
  route: string
  stops: RouteStop[]
  seats: number
  booked: number
  status: 'On Time' | 'Delayed' | 'Departed' | 'Scheduled' | 'Cancelled'
  nextAt: string
  collegeIn: string
  collegeOut: string
}

export interface Meal {
  key: 'breakfast' | 'lunch' | 'snacks' | 'dinner'
  name: string
  icon: string
  open: string
  close: string
  items: string[]
}

export interface MessDay {
  day: string
  short: string
  meals: Meal[]
  special?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  studentId?: string
  hostelId?: string
  title: string
  initials: string
}

/* =========================================================================
   Deterministic pseudo-random generator — guarantees identical demo data on
   every load (important for demos and screenshots).
   ========================================================================= */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260912)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]

/* =========================================================================
   Hostels & buildings
   ========================================================================= */
export const HOSTELS: Hostel[] = [
  {
    id: 'H1', name: 'Aryabhatta Boys Hostel', code: 'ABH', campus: 'North Campus',
    warden: 'Dr. R. Menon', contact: '+91 98110 22110', totalRooms: 24, blocks: 2,
  },
  {
    id: 'H2', name: 'Kalpana Girls Hostel', code: 'KGH', campus: 'South Campus',
    warden: 'Prof. S. Iyer', contact: '+91 98110 33440', totalRooms: 12, blocks: 1,
  },
]

export const BUILDINGS: Building[] = [
  { id: 'B1', hostelId: 'H1', name: 'Aravalli Block', code: 'ARV', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2016 },
  { id: 'B2', hostelId: 'H1', name: 'Nilgiri Block', code: 'NLG', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2019 },
  { id: 'B3', hostelId: 'H2', name: 'Vindhya Block', code: 'VND', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2021 },
]

export const FLOORS = [0, 1, 2, 3]
export const floorName = (f: number) => (f === 0 ? 'Ground Floor' : `Floor ${f}`)
export const floorShort = (f: number) => (f === 0 ? 'G' : String(f))

/* =========================================================================
   Rooms + beds (36 rooms · 126 beds)
   ========================================================================= */
const FACILITY_POOL = [
  'High-speed Wi-Fi', 'Attached Bathroom', 'Study Table', 'Wardrobe', 'Ceiling Fan',
  'Balcony', 'Power Backup', 'Geyser', 'Reading Lamp', 'Laundry Access', 'CCTV Corridor',
]

function feeFor(type: RoomType, seater: SeaterType) {
  if (type === 'AC') return seater === 3 ? 9200 : 8000
  return seater === 3 ? 6500 : 5400
}

function buildRooms(): Room[] {
  const rooms: Room[] = []
  let n = 101
  for (const b of BUILDINGS) {
    for (const f of FLOORS) {
      for (let i = 1; i <= 3; i++) {
        // Ground floor has Non-AC only, upper floors mix AC/Non-AC.
        const type: RoomType = f === 0 ? 'Non-AC' : rnd() > 0.45 ? 'AC' : 'Non-AC'
        const seater: SeaterType = rnd() > 0.42 ? 3 : 4
        const id = `${b.code}-${floorShort(f)}0${i}`
        const number = `${b.code}-${floorShort(f)}0${i}`

        // Bed status pattern: mostly occupied, some free, occasional reserved/maintenance.
        const beds: Bed[] = []
        const freeBeds = seater === 3 ? (rnd() > 0.72 ? 2 : rnd() > 0.5 ? 1 : 0) : rnd() > 0.55 ? 2 : rnd() > 0.35 ? 1 : 0
        const reservedCount = rnd() > 0.86 ? 1 : 0
        const maintCount = rnd() > 0.91 ? 1 : 0
        for (let s = 0; s < seater; s++) {
          let status: BedStatus = 'occupied'
          if (s < freeBeds) status = 'available'
          else if (s < freeBeds + reservedCount) status = 'reserved'
          else if (s < freeBeds + reservedCount + maintCount) status = 'maintenance'
          beds.push({ id: `${id}-B${s + 1}`, roomId: id, label: `B${s + 1}`, status })
        }

        const facilities = ['High-speed Wi-Fi', 'Attached Bathroom', 'Study Table', 'Wardrobe', 'Ceiling Fan']
        if (type === 'AC') facilities.push('Air Conditioning')
        if (rnd() > 0.4) facilities.push('Geyser')
        if (rnd() > 0.6) facilities.push('Balcony')
        if (rnd() > 0.5) facilities.push('Power Backup')
        if (rnd() > 0.7) facilities.push('Laundry Access')

        const monthlyFee = feeFor(type, seater)
        const allMaint = beds.every((x) => x.status === 'maintenance')

        rooms.push({
          id, number, hostelId: b.hostelId, buildingId: b.id, floor: f, type, seater, beds,
          monthlyFee,
          semesterFee: Math.round(monthlyFee * 6 * 0.95),
          securityDeposit: monthlyFee,
          facilities: Array.from(new Set(facilities)),
          maintenanceNote: allMaint ? 'Bathroom re-tiling in progress. Rooms blocked till 20 Sept.' : undefined,
          reservedFor: beds.some((x) => x.status === 'reserved') ? 'Institute quota / NRSC' : undefined,
        })
      }
    }
  }
  // Guarantee a healthy mix of every status for the demo.
  rooms[0].beds = rooms[0].beds.map((b, i) => ({ ...b, status: i === 0 ? 'available' : b.status }))
  rooms[3].beds = rooms[3].beds.map((b) => ({ ...b, status: 'maintenance' }))
  rooms[3].maintenanceNote = 'Full block maintenance — False ceiling + electrical rewiring.'
  rooms[6].beds = rooms[6].beds.map((b) => ({ ...b, status: 'reserved' }))
  rooms[6].reservedFor = 'Reserved for Inter-College Sports Meet (18–24 Sept)'
  const fullRoom = rooms.find((r, i) => i > 8 && r.beds.every((b) => b.status === 'occupied'))
  if (fullRoom) fullRoom.beds = fullRoom.beds.map((b) => ({ ...b, status: 'occupied' }))
  return rooms
}

export const ROOMS: Room[] = buildRooms()

export const ALL_FACILITIES = Array.from(new Set([...FACILITY_POOL, 'Air Conditioning'])).sort()

/* =========================================================================
   Students (private records — gated behind role checks)
   ========================================================================= */
const STUDENT_NAMES = [
  'Aarav Sharma', 'Diya Nair', 'Rohan Verma', 'Ishita Rao', 'Kabir Singh', 'Meera Joshi',
  'Aditya Menon', 'Sanya Kapoor', 'Vihaan Gupta', 'Ananya Reddy', 'Arjun Bose', 'Riya Malhotra',
  'Neel Chatterjee', 'Tara Iyer', 'Dev Patel', 'Nandini Pillai',
]
const COURSES = ['B.Tech CSE', 'B.Tech ECE', 'B.Tech Mechanical', 'B.Sc Data Science', 'BBA', 'MCA']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

/** Student S-1001 is the demo "student@roh.demo" account. */
function buildStudents(): Student[] {
  const occupied = ROOMS.flatMap((r) => r.beds.filter((b) => b.status === 'occupied').map((b) => ({ r, b })))
  const students: Student[] = []
  occupied.forEach((entry, i) => {
    if (i >= STUDENT_NAMES.length) return
    const name = STUDENT_NAMES[i]
    const s: Student = {
      id: i === 0 ? 'S-1001' : `S-${1002 + i - 1}`,
      name,
      email: i === 0 ? 'student@roh.demo' : `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@student.roh.edu`,
      rollNo: `2K2${5 - (i % 4)}-${String(100 + i)}`,
      course: COURSES[i % COURSES.length],
      year: YEARS[i % YEARS.length],
      phone: `+91 9${String(812345670 + i * 137911).slice(0, 9)}`,
      guardian: `${pick(['Mr.', 'Mrs.'])} ${name.split(' ')[1]}`,
      guardianPhone: `+91 9${String(765432180 + i * 311777).slice(0, 9)}`,
      hostelId: entry.r.hostelId,
      buildingId: entry.r.buildingId,
      roomId: entry.r.id,
      bedId: entry.b.id,
      feeTotal: entry.r.semesterFee + entry.r.securityDeposit,
      feePaid: i % 5 === 0 ? entry.r.semesterFee : Math.round((entry.r.semesterFee + entry.r.securityDeposit) * (i % 3 === 0 ? 0.55 : 1)),
      attendancePct: 84 + ((i * 3) % 15),
      avatar: name.split(' ').map((x) => x[0]).join(''),
    }
    students.push(s)
    entry.b.studentId = s.id
  })
  return students
}

export const STUDENTS: Student[] = buildStudents()

export const studentById = (id?: string) => STUDENTS.find((s) => s.id === id)

/* =========================================================================
   Auth — demo accounts for each role
   ========================================================================= */
export const DEMO_ACCOUNTS: AuthUser[] = [
  {
    id: 'U-1', email: 'student@roh.demo', name: 'Aarav Sharma', role: 'student',
    studentId: 'S-1001', hostelId: 'H1', title: 'Resident · B.Tech CSE', initials: 'AS',
  },
  {
    id: 'U-2', email: 'warden@roh.demo', name: 'Dr. R. Menon', role: 'warden',
    hostelId: 'H1', title: 'Chief Warden · Aryabhatta Boys Hostel', initials: 'RM',
  },
  {
    id: 'U-3', email: 'admin@roh.demo', name: 'Priya Krishnan', role: 'admin',
    title: 'Hostel Estate Administrator', initials: 'PK',
  },
  {
    id: 'U-4', email: 'mess@roh.demo', name: 'Chef Anand Kulkarni', role: 'mess',
    title: 'Mess Supervisor · Central Dining', initials: 'AK',
  },
  {
    id: 'U-5', email: 'transport@roh.demo', name: 'Imran Sheikh', role: 'transport',
    title: 'Transport Manager · Bus Fleet', initials: 'IS',
  },
]

export const roleLabel: Record<Role, string> = {
  student: 'Student', warden: 'Warden', admin: 'Administrator',
  mess: 'Mess Staff', transport: 'Transport Manager', guest: 'Visitor',
}

/* =========================================================================
   Mess
   ========================================================================= */
export const MESS_TIMINGS = [
  { key: 'breakfast', label: 'Breakfast', open: '07:30', close: '09:30', icon: '🍳' },
  { key: 'lunch', label: 'Lunch', open: '12:30', close: '14:30', icon: '🍛' },
  { key: 'snacks', label: 'Snacks & Tea', open: '17:00', close: '18:00', icon: '☕' },
  { key: 'dinner', label: 'Dinner', open: '19:30', close: '21:30', icon: '🍽️' },
] as const

export const MESS_WEEK: MessDay[] = [
  {
    day: 'Monday', short: 'Mon',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Aloo puri', 'Sabji', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Arhar dal', 'Parwal do pyaza', 'Roti', 'Rice', 'Pickle', 'Salad'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Samosa', 'Rasna'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Chana dal', 'Lauki kofta', 'Rice', 'Roti', 'Salad', 'Pickle'] },
    ],
  },
  {
    day: 'Tuesday', short: 'Tue',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Sambar', 'Utpam', 'Chutney', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Rajma', 'Aloo matar', 'Rice', 'Roti', 'Pickle', 'Salad'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Poha / Macaroni', 'Tea'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Puri', 'Chola', 'Kaddu', 'Khatti methi', 'Kheer', 'Rice', 'Roti', 'Pickle', 'Salad'] },
    ],
  },
  {
    day: 'Wednesday', short: 'Wed',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Aloo paratha', 'Dahi', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Kadai paneer', 'Kali masoor dal', 'Rice', 'Roti', 'Pickle', 'Salad'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Aloo bread sandwich', 'Rasna'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Egg curry / Malai kofta', 'Rice', 'Roti', 'Salad'] },
    ],
  },
  {
    day: 'Thursday', short: 'Thu',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Bread butter', 'Jam', 'Banana', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Kadhi pakoda', 'Mattar aloo / Soyabean', 'Rice', 'Roti', 'Salad'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Chow mein', 'Tea'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Dal makhani', 'Pata gobhi', 'Aloo matar', 'Sabji', 'Gulab jamun'] },
    ],
  },
  {
    day: 'Friday', short: 'Fri',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Pav bhaji / Chola kulcha', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Mix vegetable', 'Saag / Punjabi dal', 'Tadka', 'Rice', 'Roti', 'Pickle', 'Salad'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Aloo tikki burger / Veg burger', 'Tea'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Chilli paneer', 'Veg manchurian', 'Fried rice', 'Roti', 'Salad'] },
    ],
  },
  {
    day: 'Saturday', short: 'Sat',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '07:30', close: '09:30', items: ['Kala chana', 'Plain paratha', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Vegetable biryani', 'Chutney', 'Papad', 'Salad', 'Raita'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Dahi bhalla', 'Rasna'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Bhindi do pyaza', 'Chana dal', 'Roti', 'Custard / Halwa', 'Salad', 'Pickle'] },
    ],
  },
  {
    day: 'Sunday', short: 'Sun',
    meals: [
      { key: 'breakfast', name: 'Breakfast', icon: '🍳', open: '08:00', close: '10:00', items: ['Paneer paratha', 'Tea'] },
      { key: 'lunch', name: 'Lunch', icon: '🍛', open: '12:30', close: '14:30', items: ['Chole bhature', 'Rice', 'Raita', 'Pickles'] },
      { key: 'snacks', name: 'Snacks & Tea', icon: '☕', open: '17:00', close: '18:00', items: ['Aloo patice', 'Tea'] },
      { key: 'dinner', name: 'Dinner', icon: '🍽️', open: '19:30', close: '21:30', items: ['Green curry', 'Paneer do pyaza', 'Rice', 'Roti', 'Salad'] },
    ],
  },
]

export const HOLIDAY_MENU = {
  occasion: 'Independence Day · Festival Brunch',
  meals: [
    { name: 'Breakfast', icon: '🍳', time: '08:00 – 10:30', items: ['Chole bhature', 'Kesari halwa', 'Lassi', 'Seasonal fruit platter'] },
    { name: 'Lunch', icon: '🍛', time: '12:30 – 15:00', items: ['Shahi paneer', 'Veg dum biryani', 'Assorted breads', 'Gulab jamun'] },
    { name: 'Snacks', icon: '☕', time: '17:00 – 18:30', items: ['Kachori & jalebi', 'Masala chai'] },
    { name: 'Dinner', icon: '🍽️', time: '19:30 – 22:30', items: ['Special thali', 'Kaju curry', 'Pulao', 'Rasmalai'] },
  ],
}

export const GYM_TIMING = { open: '05:30', close: '21:30', note: 'Closed 13:00–15:00 for sanitisation' }
export const COLLEGE_TIMING = { classes: '08:30 – 16:30', library: '08:00 – 22:00', labs: '09:00 – 18:00' }

/* =========================================================================
   Complaints
   ========================================================================= */
export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Cleaning', 'Water', 'Electricity', 'Wi-Fi', 'Mess', 'Room Maintenance', 'Security', 'Other',
]

export const COMPLAINT_STATUSES: ComplaintStatus[] = ['pending', 'assigned', 'inprogress', 'resolved', 'reopened']

export const statusLabel: Record<string, string> = {
  pending: 'Pending', assigned: 'Assigned', inprogress: 'In Progress',
  resolved: 'Resolved', reopened: 'Reopened',
  available: 'Available', partial: 'Partially Occupied', full: 'Fully Occupied',
  reserved: 'Reserved', maintenance: 'Under Maintenance',
  occupied: 'Occupied',
}

export const SEED_COMPLAINTS: Complaint[] = [
  {
    id: 'C-01', ticket: 'ROH-4471', category: 'Wi-Fi', title: 'Wi-Fi drops every evening on 2nd floor',
    description: 'Router ABH-2F-02 keeps disconnecting between 20:00 and 23:00. Unable to attend online labs.',
    priority: 'high', roomNumber: 'ARV-201', raisedBy: 'Aarav Sharma', studentId: 'S-1001',
    createdAt: '2026-09-08T19:10:00', status: 'inprogress', assignedTo: 'Network Cell · Ravi T.',
    timeline: [
      { at: '2026-09-08T19:10:00', label: 'Complaint raised', by: 'Aarav Sharma' },
      { at: '2026-09-08T21:40:00', label: 'Assigned to Network Cell', by: 'Warden Office', note: 'Priority escalated — affects 14 rooms.' },
      { at: '2026-09-09T11:05:00', label: 'Technician visiting', by: 'Ravi T.', note: 'Replacement router ordered.' },
    ],
  },
  {
    id: 'C-02', ticket: 'ROH-4468', category: 'Water', title: 'Low water pressure in washroom',
    description: 'Geyser inlet has very low pressure since Sunday. Hot water barely reaches the shower.',
    priority: 'medium', roomNumber: 'ARV-201', raisedBy: 'Aarav Sharma', studentId: 'S-1001',
    createdAt: '2026-09-06T08:20:00', status: 'resolved', assignedTo: 'Plumbing Team · Suresh K.',
    timeline: [
      { at: '2026-09-06T08:20:00', label: 'Complaint raised', by: 'Aarav Sharma' },
      { at: '2026-09-06T10:00:00', label: 'Assigned to Plumbing Team', by: 'Warden Office' },
      { at: '2026-09-06T15:45:00', label: 'Valve replaced', by: 'Suresh K.', note: 'Pressure restored to 2.1 bar.' },
      { at: '2026-09-06T16:00:00', label: 'Marked resolved', by: 'Warden Office' },
    ],
  },
  {
    id: 'C-03', ticket: 'ROH-4455', category: 'Cleaning', title: 'Corridor dustbins not cleared',
    description: 'Third floor corridor bins overflowing for two days.',
    priority: 'low', roomNumber: 'NLG-303', raisedBy: 'Rohan Verma', studentId: 'S-1003',
    createdAt: '2026-09-04T07:30:00', status: 'pending',
    timeline: [{ at: '2026-09-04T07:30:00', label: 'Complaint raised', by: 'Rohan Verma' }],
  },
  {
    id: 'C-04', ticket: 'ROH-4441', category: 'Electricity', title: 'Tube light flickering in study area',
    description: 'Flickering tube light causes headaches during night study hours.',
    priority: 'medium', roomNumber: 'ARV-102', raisedBy: 'Kabir Singh', studentId: 'S-1005',
    createdAt: '2026-09-02T21:15:00', status: 'assigned', assignedTo: 'Electrical Team · Naveen P.',
    timeline: [
      { at: '2026-09-02T21:15:00', label: 'Complaint raised', by: 'Kabir Singh' },
      { at: '2026-09-03T09:10:00', label: 'Assigned to Electrical Team', by: 'Warden Office' },
    ],
  },
  {
    id: 'C-05', ticket: 'ROH-4430', category: 'Mess', title: 'Dinner served cold on Sunday',
    description: 'Dinner counter closed 20 minutes early, food was cold for late arrivals.',
    priority: 'medium', roomNumber: 'ARV-203', raisedBy: 'Ishita Rao', studentId: 'S-1004',
    createdAt: '2026-08-31T21:00:00', status: 'resolved', assignedTo: 'Mess Committee',
    timeline: [
      { at: '2026-08-31T21:00:00', label: 'Complaint raised', by: 'Ishita Rao' },
      { at: '2026-09-01T09:00:00', label: 'Reviewed by Mess Committee', by: 'Chef Anand K.' },
      { at: '2026-09-01T18:00:00', label: 'Hot-case deployed, timing extended', by: 'Mess Committee' },
      { at: '2026-09-01T18:05:00', label: 'Marked resolved', by: 'Warden Office' },
    ],
  },
  {
    id: 'C-06', ticket: 'ROH-4490', category: 'Room Maintenance', title: 'Cupboard hinge broken',
    description: 'Left cupboard door hinge snapped, door hangs loose.',
    priority: 'low', roomNumber: 'VND-104', raisedBy: 'Meera Joshi', studentId: 'S-1006',
    createdAt: '2026-09-10T16:40:00', status: 'reopened',
    timeline: [
      { at: '2026-09-10T16:40:00', label: 'Complaint raised', by: 'Meera Joshi' },
      { at: '2026-09-11T10:00:00', label: 'Carpenter assigned', by: 'Warden Office' },
      { at: '2026-09-11T17:00:00', label: 'Repair attempted', by: 'Carpenter · Mahesh' },
      { at: '2026-09-11T18:20:00', label: 'Reopened by student', by: 'Meera Joshi', note: 'Door still misaligned, closes with a gap.' },
    ],
  },
  {
    id: 'C-07', ticket: 'ROH-4495', category: 'Security', title: 'Gate 2 CCTV camera offline',
    description: 'Camera above Gate 2 shows no feed on the security console.',
    priority: 'high', roomNumber: 'NLG-201', raisedBy: 'Dev Patel', studentId: 'S-1015',
    createdAt: '2026-09-11T22:10:00', status: 'pending',
    timeline: [{ at: '2026-09-11T22:10:00', label: 'Complaint raised', by: 'Dev Patel' }],
  },
]

/* =========================================================================
   Payments
   ========================================================================= */
/** Seeded receipts are derived from each student's fee record so that the
    ledger, the summary cards and the admin tables always agree — a receipt
    history that contradicted the running balance would be a data bug. */
function buildSeedPayments(): Payment[] {
  const rows: Payment[] = []
  const demo = STUDENTS.find((s) => s.id === 'S-1001')
  const second = STUDENTS.find((s) => s.id === 'S-1002')
  const third = STUDENTS.find((s) => s.id === 'S-1003')

  if (demo) {
    const rent = ROOMS.find((r) => r.id === demo.roomId)?.monthlyFee ?? 6500
    const monthlyRows = Math.max(Math.min(2, Math.floor(demo.feePaid / Math.max(rent, 1)) - 1), 0)
    const remainder = Math.max(demo.feePaid - rent * monthlyRows, 0)
    rows.push({
      id: 'P-01', studentId: demo.id, receipt: 'RCPT-2607-118', amount: remainder,
      mode: 'UPI · GPay', status: 'Paid', date: '2026-07-28',
      term: 'Odd Semester 2026-27 · part payment',
    })
    for (let i = 0; i < monthlyRows; i++) {
      rows.push({
        id: `P-0${2 + i}`, studentId: demo.id,
        receipt: i === 0 ? 'RCPT-2608-092' : 'RCPT-2609-201',
        amount: rent, mode: i === 0 ? 'Net Banking' : 'UPI · Paytm', status: 'Paid',
        date: i === 0 ? '2026-08-05' : '2026-09-03',
        term: i === 0 ? 'Monthly Fee · August' : 'Monthly Fee · September',
      })
    }
  }

  if (second) {
    rows.push({
      id: 'P-04', studentId: second.id, receipt: 'RCPT-2609-145', amount: second.feePaid,
      mode: 'UPI · PhonePe', status: 'Paid', date: '2026-09-01', term: 'Odd Semester 2026-27',
    })
  }

  if (third) {
    rows.push({
      id: 'P-05', studentId: third.id, receipt: 'RCPT-2609-150',
      amount: Math.max(third.feeTotal - third.feePaid, 0),
      mode: 'Net Banking', status: 'Pending', date: '2026-09-12', term: 'Odd Semester 2026-27',
    })
  }

  return rows
}

export const SEED_PAYMENTS: Payment[] = buildSeedPayments()

/** Ids of the seeded receipts — new demo payments get ids beyond these. */
const SEED_PAYMENT_IDS = new Set(SEED_PAYMENTS.map((p) => p.id))

/** Single source of truth for a student's balance.
    `feePaid` is the opening balance; payments made during the session are added
    on top, and seeded receipts are never counted twice. */
export function amountsFor(student: Student, payments: Payment[]) {
  const mine = payments.filter((p) => p.studentId === student.id)
  const sessionPaid = mine
    .filter((p) => p.status === 'Paid' && !SEED_PAYMENT_IDS.has(p.id))
    .reduce((a, p) => a + p.amount, 0)
  const paid = Math.min(student.feePaid + sessionPaid, student.feeTotal)
  return {
    paid,
    pending: Math.max(student.feeTotal - paid, 0),
    receipts: mine.length,
    records: mine,
  }
}

/* =========================================================================
   Notices
   ========================================================================= */
export const SEED_NOTICES: Notice[] = [
  { id: 'N-01', title: 'Wi-Fi upgrade window: 15–16 Sept, 01:00–05:00', category: 'Maintenance', body: 'The campus fibre backbone is being upgraded. Expect intermittent connectivity across all blocks during the maintenance window. Wired LAN ports in the reading room will remain active.', date: '2026-09-11', pinned: true, audience: 'All residents', by: 'Estate Office' },
  { id: 'N-02', title: 'Odd-semester hostel fee due on 30 Sept', category: 'Fees', body: 'A late fee of ₹250 per week applies after the due date. Pay through the ROH Payments page — receipts are generated instantly. Contact the accounts desk for instalment requests.', date: '2026-09-09', pinned: true, audience: 'All residents', by: 'Accounts Section' },
  { id: 'N-03', title: 'Special weekend mess menu announced', category: 'Mess', body: 'Saturday dinner includes a live noodle counter and Sunday brunch is extended to 10:30. Feedback forms are open on the Mess page until Friday evening.', date: '2026-09-08', pinned: false, audience: 'All residents', by: 'Mess Committee' },
  { id: 'N-04', title: 'Shuttle bus route 3 timing revised', category: 'Transport', body: 'Route 3 (Gate 2 → Academic Block) now departs 10 minutes earlier at 07:40 to reduce congestion at the main gate. Check the Transport page for the full timetable.', date: '2026-09-07', pinned: false, audience: 'All residents', by: 'Transport Office' },
  { id: 'N-05', title: 'Fire safety drill on 20 Sept at 16:00', category: 'Safety', body: 'Compulsory evacuation drill for all blocks. Assembly point: basketball court. Wardens will mark attendance — please cooperate with floor marshals.', date: '2026-09-06', pinned: false, audience: 'All residents', by: 'Safety Cell' },
  { id: 'N-06', title: 'Room inspection round for Aravalli Block', category: 'General', body: 'Wardens will inspect rooms for electrical safety and appliance compliance between 10:00 and 13:00. Please keep your room accessible.', date: '2026-09-05', pinned: false, audience: 'Aravalli Block', by: 'Warden Office' },
  { id: 'N-07', title: 'Late-night study hall open till 01:00', category: 'Event', body: 'The ground-floor reading hall stays open till 01:00 during the mid-semester period. Carry your ID card for entry after 22:00.', date: '2026-09-03', pinned: false, audience: 'All residents', by: 'Library Committee' },
]

/* =========================================================================
   Transport
   ========================================================================= */
export const TRANSPORT_ROUTES: TransportRoute[] = [
  {
    id: 'T-01', busNo: 'UK-07-AB-4412', driver: 'Harpal Singh', driverPhone: '+91 98330 44120',
    route: 'Route 1 · Hostel → Academic Block (Loop)',
    stops: [
      { point: 'Aryabhatta Hostel Gate', depart: '07:30', arrive: '07:33' },
      { point: 'Kalpana Hostel Gate', depart: '07:36', arrive: '07:39' },
      { point: 'Central Library', depart: '07:42', arrive: '07:45' },
      { point: 'Academic Block / Lecture Halls', depart: '07:50', arrive: '—' },
    ],
    seats: 42, booked: 31, status: 'On Time', nextAt: '07:30', collegeIn: '08:00', collegeOut: '16:30',
  },
  {
    id: 'T-02', busNo: 'UK-07-AB-4418', driver: 'Mahesh Yadav', driverPhone: '+91 98330 44181',
    route: 'Route 2 · Hostel → City Market (Weekend)',
    stops: [
      { point: 'Hostel Main Gate', depart: '09:00', arrive: '09:04' },
      { point: 'Sector 12 Market', depart: '09:25', arrive: '09:30' },
      { point: 'Railway Station Road', depart: '09:45', arrive: '09:50' },
    ],
    seats: 32, booked: 32, status: 'Scheduled', nextAt: '09:00', collegeIn: '—', collegeOut: '18:00',
  },
  {
    id: 'T-03', busNo: 'UK-07-AB-4421', driver: 'Rakesh Bhatt', driverPhone: '+91 98330 44215',
    route: 'Route 3 · Gate 2 → Academic Block (Express)',
    stops: [
      { point: 'Gate 2 Pickup Point', depart: '07:40', arrive: '07:43' },
      { point: 'Sports Complex', depart: '07:47', arrive: '07:49' },
      { point: 'Academic Block', depart: '07:58', arrive: '—' },
    ],
    seats: 24, booked: 12, status: 'On Time', nextAt: '07:40', collegeIn: '08:00', collegeOut: '16:30',
  },
  {
    id: 'T-04', busNo: 'UK-07-AB-4433', driver: 'Sohan Lal', driverPhone: '+91 98330 44330',
    route: 'Route 4 · Hostel → City Bus Stand',
    stops: [
      { point: 'Hostel Main Gate', depart: '17:15', arrive: '17:19' },
      { point: 'Civil Lines Crossing', depart: '17:34', arrive: '17:38' },
      { point: 'City Bus Stand', depart: '17:55', arrive: '—' },
    ],
    seats: 32, booked: 20, status: 'Delayed', nextAt: '17:15', collegeIn: '—', collegeOut: '17:00',
  },
  {
    id: 'T-05', busNo: 'UK-07-AB-4409', driver: 'Naseem Khan', driverPhone: '+91 98330 44090',
    route: 'Route 5 · Night Shuttle (Library Loop)',
    stops: [
      { point: 'Central Library', depart: '22:00', arrive: '22:04' },
      { point: 'Aryabhatta Hostel', depart: '22:10', arrive: '22:13' },
      { point: 'Kalpana Hostel', depart: '22:16', arrive: '22:20' },
    ],
    seats: 20, booked: 7, status: 'Scheduled', nextAt: '22:00', collegeIn: '—', collegeOut: '23:00',
  },
]

/* =========================================================================
   Emergency contacts
   ========================================================================= */
export const EMERGENCY_CONTACTS = [
  { label: 'Warden (Aryabhatta)', value: '+91 98110 22110', icon: '👮' },
  { label: 'Campus Security Control', value: '+91 98110 22900', icon: '🛡️' },
  { label: 'Medical Room / Ambulance', value: '+91 98110 22108', icon: '🚑' },
  { label: 'Fire Station (Campus)', value: '+91 98110 22119', icon: '🚒' },
  { label: 'Anti-Ragging Helpline', value: '1800 180 5522', icon: '📞' },
  { label: 'Estate Helpdesk', value: 'helpdesk@roh.edu', icon: '✉️' },
]

/* =========================================================================
   Derived selectors
   ========================================================================= */
export function roomStatus(room: Room): RoomStatus {
  const total = room.beds.length
  const avail = room.beds.filter((b) => b.status === 'available').length
  const occ = room.beds.filter((b) => b.status === 'occupied').length
  const maint = room.beds.filter((b) => b.status === 'maintenance').length
  const res = room.beds.filter((b) => b.status === 'reserved').length
  if (maint === total) return 'maintenance'
  if (avail === total) return 'available'
  if (res > 0 && occ === 0 && avail === 0) return 'reserved'
  if (avail === 0) return 'full'
  return occ === 0 && res > 0 ? 'reserved' : 'partial'
}

export const bedCounts = (room: Room) => ({
  total: room.beds.length,
  occupied: room.beds.filter((b) => b.status === 'occupied').length,
  available: room.beds.filter((b) => b.status === 'available').length,
  reserved: room.beds.filter((b) => b.status === 'reserved').length,
  maintenance: room.beds.filter((b) => b.status === 'maintenance').length,
})

export const getHostel = (id: string) => HOSTELS.find((h) => h.id === id)
export const getBuilding = (id: string) => BUILDINGS.find((b) => b.id === id)
export const getRoom = (id: string) => ROOMS.find((r) => r.id === id)

export const roomLabel = (room: Room) => `${getBuilding(room.buildingId)?.code ?? ''}-${room.number}`

export const hostelStats = () => {
  const beds = ROOMS.flatMap((r) => r.beds)
  const totalRooms = ROOMS.length
  const occupied = beds.filter((b) => b.status === 'occupied').length
  const available = beds.filter((b) => b.status === 'available').length
  const reserved = beds.filter((b) => b.status === 'reserved').length
  const maintenanceBeds = beds.filter((b) => b.status === 'maintenance').length
  const maintRooms = ROOMS.filter((r) => roomStatus(r) === 'maintenance').length
  return {
    totalHostels: HOSTELS.length,
    totalBuildings: BUILDINGS.length,
    totalFloors: BUILDINGS.reduce((a, b) => a + b.floors, 0),
    totalRooms,
    totalBeds: beds.length,
    occupied,
    available,
    reserved,
    maintenanceBeds,
    maintRooms,
    occupancyPct: Math.round((occupied / beds.length) * 100),
    registeredStudents: STUDENTS.length * 8 + 24,
    applications: 14,
    pendingComplaints: SEED_COMPLAINTS.filter((c) => c.status !== 'resolved').length,
    feeCollected: ROOMS.reduce((a, r) => a + r.semesterFee * bedCounts(r).occupied, 0),
    feePending: ROOMS.reduce((a, r) => a + r.semesterFee * bedCounts(r).occupied, 0) * 0.18,
  }
}

export const facilitiesByBuilding = (buildingId: string) =>
  Array.from(new Set(ROOMS.filter((r) => r.buildingId === buildingId).flatMap((r) => r.facilities))).sort()

export const todayLong = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const todayShort = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })

export const todayDayName = () => new Date().toLocaleDateString('en-IN', { weekday: 'long' })

export const rupee = (n: number) => '₹' + n.toLocaleString('en-IN')
