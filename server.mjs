/* =========================================================================
   Realm of Hostel (ROH) — Node.js In-Memory REST API & Static Server
   Option A: Zero-dependency Node.js HTTP server providing REST API endpoints
   + static file serving with SPA fallback.
   ========================================================================= */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT ?? 8080)

/* -------------------------------------------------------------------------
   In-Memory Backend Dataset
   ------------------------------------------------------------------------- */
const HOSTELS = [
  { id: 'H1', name: 'Aryabhatta Boys Hostel', code: 'ABH', campus: 'North Campus', warden: 'Dr. R. Menon', contact: '+91 98110 22110', totalRooms: 24, blocks: 2 },
  { id: 'H2', name: 'Kalpana Girls Hostel', code: 'KGH', campus: 'South Campus', warden: 'Prof. S. Iyer', contact: '+91 98110 33440', totalRooms: 12, blocks: 1 },
]

const BUILDINGS = [
  { id: 'B1', hostelId: 'H1', name: 'Aravalli Block', code: 'ARV', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2016 },
  { id: 'B2', hostelId: 'H1', name: 'Nilgiri Block', code: 'NLG', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2019 },
  { id: 'B3', hostelId: 'H2', name: 'Vindhya Block', code: 'VND', floors: 4, floorsLabel: 'Ground + 3', yearBuilt: 2021 },
]

const NOTICES = [
  { id: 'N-1', title: 'Annual Hostel Inspection & Fire Drill', category: 'General', body: 'Mandatory fire safety drill scheduled across all blocks this Saturday at 10:00 AM.', date: '2026-09-12', pinned: true, by: 'Admin Console', audience: 'All Residents' },
  { id: 'N-2', title: 'Special South Indian Dinner Menu', category: 'Mess', body: 'Special Dosa & Masala Vada feast scheduled for Sunday evening dining.', date: '2026-09-11', pinned: false, by: 'Mess Warden', audience: 'Mess Subscribers' },
]

const COMPLAINTS = [
  { id: 'C-101', ticket: 'ROH-4471', category: 'Wi-Fi', title: 'High latency on Floor 2', description: 'Signal drops intermittently near room ARV-201.', priority: 'high', roomNumber: 'ARV-201', raisedBy: 'Aarav Sharma', studentId: 'S-1001', createdAt: '2026-09-10T14:30:00Z', status: 'pending', timeline: [{ at: '2026-09-10T14:30:00Z', label: 'Ticket created', by: 'Aarav Sharma' }] },
  { id: 'C-102', ticket: 'ROH-4455', category: 'Cleaning', title: 'Corridor bin cleanup', description: 'Ground floor waste bin requires clearing.', priority: 'low', roomNumber: 'NLG-102', raisedBy: 'Rohan Verma', studentId: 'S-1004', createdAt: '2026-09-09T09:15:00Z', status: 'inprogress', timeline: [{ at: '2026-09-09T09:15:00Z', label: 'Ticket created', by: 'Rohan Verma' }] },
]

const PAYMENTS = [
  { id: 'P-1', studentId: 'S-1001', receipt: 'RCPT-2609-101', amount: 45000, mode: 'UPI', status: 'Paid', date: '2026-09-01', term: 'Semester I 2026' },
  { id: 'P-2', studentId: 'S-1002', receipt: 'RCPT-2609-102', amount: 45000, mode: 'NetBanking', status: 'Paid', date: '2026-09-02', term: 'Semester I 2026' },
]

const TRANSPORT_ROUTES = [
  { id: 'TR-1', busNo: 'KA-01-HB-101', driver: 'Rajesh Kumar', driverPhone: '+91 98450 11223', route: 'Campus North $\\rightarrow$ Metro Central', stops: [{ point: 'Hostel Gate 1', depart: '08:00', arrive: '08:05' }, { point: 'Metro Station', depart: '08:30', arrive: '08:35' }], seats: 45, booked: 28, status: 'On Time', nextAt: '08:00 AM', collegeIn: '08:45 AM', collegeOut: '05:15 PM' },
  { id: 'TR-2', busNo: 'KA-01-HB-202', driver: 'Mahesh Patil', driverPhone: '+91 98450 33445', route: 'Campus South $\\rightarrow$ Tech Park', stops: [{ point: 'Girls Hostel Gate', depart: '08:15', arrive: '08:20' }, { point: 'Tech Park', depart: '08:50', arrive: '08:55' }], seats: 40, booked: 35, status: 'Scheduled', nextAt: '08:15 AM', collegeIn: '09:00 AM', collegeOut: '05:30 PM' },
]

const MESS_WEEK = [
  { day: 'Monday', short: 'Mon', meals: [{ key: 'breakfast', name: 'Breakfast', icon: 'coffee', open: '07:30', close: '09:30', items: ['Idli Sambhar', 'Coconut Chutney', 'Tea / Coffee'] }, { key: 'lunch', name: 'Lunch', icon: 'utensils', open: '12:30', close: '14:30', items: ['Roti', 'Paneer Butter Masala', 'Dal Tadka', 'Rice', 'Curd'] }, { key: 'snacks', name: 'Snacks', icon: 'coffee', open: '17:00', close: '18:00', items: ['Samosa', 'Chai'] }, { key: 'dinner', name: 'Dinner', icon: 'moon', open: '19:30', close: '21:30', items: ['Chapatis', 'Mix Veg Curry', 'Jeera Rice', 'Kheer'] }] },
  { day: 'Tuesday', short: 'Tue', meals: [{ key: 'breakfast', name: 'Breakfast', icon: 'coffee', open: '07:30', close: '09:30', items: ['Poha', 'Jalebi', 'Tea / Coffee'] }, { key: 'lunch', name: 'Lunch', icon: 'utensils', open: '12:30', close: '14:30', items: ['Roti', 'Rajma Masala', 'Steamed Rice', 'Salad'] }, { key: 'snacks', name: 'Snacks', icon: 'coffee', open: '17:00', close: '18:00', items: ['Veg Sandwich', 'Coffee'] }, { key: 'dinner', name: 'Dinner', icon: 'moon', open: '19:30', close: '21:30', items: ['Naan', 'Dal Makhani', 'Rice', 'Gulab Jamun'] }] },
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const sendJson = (res, code, data) => {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(data))
}

const readBody = (req) => new Promise((resolve) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}) } catch { resolve({}) }
  })
})

/* -------------------------------------------------------------------------
   HTTP Request Listener (API Routes + Static File Server)
   ------------------------------------------------------------------------- */
createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`)
    const method = req.method?.toUpperCase() ?? 'GET'

    // CORS Preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
      return res.end()
    }

    // REST API ENDPOINTS (/api/*)
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/hostels') return sendJson(res, 200, HOSTELS)
      if (url.pathname === '/api/buildings') return sendJson(res, 200, BUILDINGS)
      if (url.pathname === '/api/mess/week') return sendJson(res, 200, MESS_WEEK)
      if (url.pathname === '/api/transport/routes') return sendJson(res, 200, TRANSPORT_ROUTES)

      if (url.pathname === '/api/notices') {
        if (method === 'GET') return sendJson(res, 200, NOTICES)
        if (method === 'POST') {
          const body = await readBody(req)
          const newNotice = { id: `N-${NOTICES.length + 1}`, ...body, date: new Date().toISOString().slice(0, 10) }
          NOTICES.unshift(newNotice)
          return sendJson(res, 201, newNotice)
        }
      }

      if (url.pathname.startsWith('/api/notices/') && method === 'DELETE') {
        const id = decodeURIComponent(url.pathname.replace('/api/notices/', ''))
        const idx = NOTICES.findIndex((n) => n.id === id)
        if (idx !== -1) NOTICES.splice(idx, 1)
        return sendJson(res, 200, { ok: true, deletedId: id })
      }

      if (url.pathname === '/api/complaints') {
        if (method === 'GET') {
          const studentId = url.searchParams.get('studentId')
          const filtered = studentId ? COMPLAINTS.filter((c) => c.studentId === studentId) : COMPLAINTS
          return sendJson(res, 200, filtered)
        }
        if (method === 'POST') {
          const body = await readBody(req)
          const newComplaint = {
            id: `C-${COMPLAINTS.length + 101}`,
            ticket: `ROH-${4500 + COMPLAINTS.length}`,
            createdAt: new Date().toISOString(),
            status: 'pending',
            timeline: [{ at: new Date().toISOString(), label: 'Complaint raised', by: body.raisedBy || 'Resident' }],
            ...body,
          }
          COMPLAINTS.unshift(newComplaint)
          return sendJson(res, 201, newComplaint)
        }
      }

      if (url.pathname === '/api/payments') {
        if (method === 'GET') return sendJson(res, 200, PAYMENTS)
        if (method === 'POST') {
          const body = await readBody(req)
          const newPayment = {
            id: `P-${PAYMENTS.length + 1}`,
            receipt: `RCPT-2609-${300 + PAYMENTS.length}`,
            date: new Date().toISOString().slice(0, 10),
            status: 'Paid',
            ...body,
          }
          PAYMENTS.unshift(newPayment)
          return sendJson(res, 201, newPayment)
        }
      }

      return sendJson(res, 404, { error: 'API route not found' })
    }

    // STATIC FILE SERVING WITH SPA FALLBACK
    let path = join(root, normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''))
    let info = await stat(path).catch(() => null)
    if (!info || info.isDirectory()) {
      path = join(root, 'index.html')
      info = await stat(path)
    }
    const body = await readFile(path)
    res.writeHead(200, {
      'Content-Type': MIME[extname(path)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Server error: ' + String(err))
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ROH Server & In-Memory REST API running on http://0.0.0.0:${PORT}`)
})
