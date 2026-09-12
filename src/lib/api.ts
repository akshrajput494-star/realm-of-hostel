/* =========================================================================
   ROH data access layer
   -------------------------------------------------------------------------
   Every screen reads data through this module, never from the mock arrays
   directly. Today `api` is backed by the in-memory demo dataset; pointing it
   at a real backend is a single-file change:

       export const api = createHttpApi(import.meta.env.VITE_ROH_API_URL)

   The REST contract implemented below matches the domain types in
   src/data/mock.ts, so an Express/Nest/Firebase backend only has to return
   the same JSON shapes:

     GET    /hostels                         → Hostel[]
     GET    /buildings                       → Building[]
     GET    /rooms?type=&seater=&building=   → Room[]        (public: no student ids)
     GET    /rooms/:id                       → Room
     GET    /students/:id                    → Student       (auth: self/warden/admin)
     GET    /complaints?studentId=           → Complaint[]
     POST   /complaints                      → Complaint
     PATCH  /complaints/:id                  → Complaint       (auth: warden/admin)
     GET    /payments?studentId=             → Payment[]
     POST   /payments                        → Payment         (gateway webhook in prod)
     GET    /notices                         → Notice[]
     POST   /notices                         → Notice          (auth: warden/admin)
     GET    /mess/week                       → MessDay[]
     GET    /transport/routes                → TransportRoute[]

   Authorisation rules the backend must enforce (the UI mirrors them):
     • bed status is public; occupant identity is not
     • student records: self, warden, admin only
     • roommate disclosure: verified residents of the same room + warden/admin
     • mess staff → mess endpoints only; transport manager → transport only
   ========================================================================= */

import {
  BUILDINGS, Complaint, HOSTELS, MESS_WEEK, MessDay, Notice, Payment, ROOMS, Room, SEED_COMPLAINTS,
  SEED_NOTICES, SEED_PAYMENTS, STUDENTS, Student, TRANSPORT_ROUTES, TransportRoute,
} from '../data/mock'

/** Simulated round-trip so loading states in the UI are honest. */
const latency = (ms = 260) => new Promise<void>((r) => setTimeout(r, ms))

export interface RoomQuery {
  type?: 'AC' | 'Non-AC'
  seater?: 3 | 4
  buildingId?: string
  floor?: number
}

export interface RohApi {
  hostels: { list: () => Promise<typeof HOSTELS> }
  buildings: { list: () => Promise<typeof BUILDINGS> }
  rooms: {
    list: (query?: RoomQuery) => Promise<Room[]>
    byId: (id: string) => Promise<Room | undefined>
  }
  students: { byId: (id: string) => Promise<Student | undefined> }
  complaints: {
    list: (filter?: { studentId?: string }) => Promise<Complaint[]>
    create: (input: Complaint) => Promise<Complaint>
  }
  payments: {
    list: (filter?: { studentId?: string }) => Promise<Payment[]>
    create: (input: Payment) => Promise<Payment>
  }
  notices: {
    list: () => Promise<Notice[]>
    create: (input: Notice) => Promise<Notice>
    remove: (id: string) => Promise<void>
  }
  mess: { week: () => Promise<MessDay[]> }
  transport: { routes: () => Promise<TransportRoute[]> }
}

/* -------------------------------------------------------------------------
   Demo implementation (browser-local)
   ------------------------------------------------------------------------- */
export const mockApi: RohApi = {
  hostels: { list: async () => { await latency(120); return HOSTELS } },
  buildings: { list: async () => { await latency(120); return BUILDINGS } },

  rooms: {
    list: async (query) => {
      await latency()
      return ROOMS.filter((r) => (
        (!query?.type || r.type === query.type)
        && (!query?.seater || r.seater === query.seater)
        && (!query?.buildingId || r.buildingId === query.buildingId)
        && (query?.floor === undefined || r.floor === query.floor)
      ))
    },
    byId: async (id) => { await latency(140); return ROOMS.find((r) => r.id === id) },
  },

  students: { byId: async (id) => { await latency(140); return STUDENTS.find((s) => s.id === id) } },

  complaints: {
    list: async (filter) => {
      await latency(180)
      const rows = filter?.studentId ? SEED_COMPLAINTS.filter((c) => c.studentId === filter.studentId) : SEED_COMPLAINTS
      return rows
    },
    create: async (input) => { await latency(300); return input },
  },

  payments: {
    list: async (filter) => {
      await latency(180)
      return filter?.studentId ? SEED_PAYMENTS.filter((p) => p.studentId === filter.studentId) : SEED_PAYMENTS
    },
    create: async (input) => { await latency(420); return input },
  },

  notices: {
    list: async () => { await latency(160); return SEED_NOTICES },
    create: async (input) => { await latency(260); return input },
    remove: async () => { await latency(200) },
  },

  mess: { week: async () => { await latency(140); return MESS_WEEK } },
  transport: { routes: async () => { await latency(140); return TRANSPORT_ROUTES } },
}

/* -------------------------------------------------------------------------
   HTTP implementation — drop-in replacement for production.
   Kept thin and dependency-free (native fetch).
   ------------------------------------------------------------------------- */
export function createHttpApi(baseUrl: string, getToken?: () => string | null): RohApi {
  const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const token = getToken?.()
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`ROH API ${res.status} on ${path}`)
    return res.status === 204 ? (undefined as T) : (await res.json()) as T
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') search.set(k, String(v)) })
    const s = search.toString()
    return s ? `?${s}` : ''
  }

  return {
    hostels: { list: () => request('/hostels') },
    buildings: { list: () => request('/buildings') },
    rooms: {
      list: (query) => request(`/rooms${qs({ type: query?.type, seater: query?.seater, buildingId: query?.buildingId, floor: query?.floor })}`),
      byId: (id) => request(`/rooms/${encodeURIComponent(id)}`),
    },
    students: { byId: (id) => request(`/students/${encodeURIComponent(id)}`) },
    complaints: {
      list: (filter) => request(`/complaints${qs({ studentId: filter?.studentId })}`),
      create: (input) => request('/complaints', { method: 'POST', body: JSON.stringify(input) }),
    },
    payments: {
      list: (filter) => request(`/payments${qs({ studentId: filter?.studentId })}`),
      create: (input) => request('/payments', { method: 'POST', body: JSON.stringify(input) }),
    },
    notices: {
      list: () => request('/notices'),
      create: (input) => request('/notices', { method: 'POST', body: JSON.stringify(input) }),
      remove: (id) => request(`/notices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    },
    mess: { week: () => request('/mess/week') },
    transport: { routes: () => request('/transport/routes') },
  }
}

/* The active implementation. Swap the line below to go live. */
export const api: RohApi = mockApi
export default api
