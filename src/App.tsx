import React, { useEffect } from 'react'
import { RouterProvider, useRouter } from './lib/router'
import { StoreProvider, useApp } from './lib/store'
import { Toaster } from './lib/ui'
import { Footer, Nav } from './components/Nav'
import { Home } from './pages/Home'
import { ExploreRooms } from './pages/ExploreRooms'
import { RoomDetails } from './pages/RoomDetails'
import { HostelMap } from './pages/HostelMap'
import { Mess } from './pages/Mess'
import { Transport } from './pages/Transport'
import { Complaints } from './pages/Complaints'
import { Payments } from './pages/Payments'
import { Notices } from './pages/Notices'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Admin } from './pages/Admin'
import { Privacy, Terms } from './pages/Legal'
import { NotFound } from './pages/NotFound'

const TITLES: Record<string, string> = {
  '/': 'Login & Access · ROH',
  '/rooms': 'Explore Rooms · ROH',
  '/map': '3D Hostel Map · ROH',
  '/mess': 'Mess & Menu · ROH',
  '/transport': 'Transport · ROH',
  '/complaints': 'Complaints · ROH',
  '/payments': 'Payments · ROH',
  '/notices': 'Notices · ROH',
  '/login': 'Login & Roles · ROH',
  '/dashboard': 'Dashboard · ROH',
  '/admin': 'Admin Console · ROH',
  '/privacy': 'Privacy Policy · ROH',
  '/terms': 'Terms of Use · ROH',
}

function AppContent() {
  const { path } = useRouter()
  const { user } = useApp()

  useEffect(() => {
    const key = path.startsWith('/rooms/') ? '/rooms' : path
    document.title = TITLES[key] ?? 'ROH · Realm of Hostel'
  }, [path])

  // Strict Login Gate: If no user is logged in, show ONLY the Login interface
  if (!user) {
    return (
      <div className="shell">
        <main className="main" id="main">
          <Login />
        </main>
        <Toaster />
      </div>
    )
  }

  let page: React.ReactNode
  if (path === '/' || path === '/login') page = <Home />
  else if (path === '/rooms') page = <ExploreRooms />
  else if (path.startsWith('/rooms/')) page = <RoomDetails />
  else if (path === '/map') page = <HostelMap />
  else if (path === '/mess') page = <Mess />
  else if (path === '/transport') page = <Transport />
  else if (path === '/complaints') page = <Complaints />
  else if (path === '/payments') page = <Payments />
  else if (path === '/notices') page = <Notices />
  else if (path === '/dashboard') page = <Dashboard />
  else if (path === '/admin') page = <Admin />
  else if (path === '/privacy') page = <Privacy />
  else if (path === '/terms') page = <Terms />
  else page = <NotFound path={path} />

  // key on the path replays the page transition on every navigation
  return (
    <div className="shell">
      <a href="#main" className="btn btn-ghost btn-sm" style={{ position: 'absolute', left: -9999, top: 8, zIndex: 999 }}>
        Skip to content
      </a>
      <Nav />
      <main className="main" id="main">
        <div key={path}>{page}</div>
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </RouterProvider>
  )
}
