import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/* -------------------------------------------------------------------------
   Lightweight hash router.
   Hash routing keeps every deep link (e.g. #/rooms/ARV-101) shareable without
   needing server-side rewrite rules — ideal for a static hackathon deploy.
   ------------------------------------------------------------------------- */

interface RouterCtx {
  path: string
  query: URLSearchParams
  navigate: (to: string, opts?: { replace?: boolean }) => void
}

const Ctx = createContext<RouterCtx>({
  path: '/',
  query: new URLSearchParams(),
  navigate: () => {},
})

function currentHash() {
  const raw = window.location.hash.replace(/^#/, '')
  // In-page anchors (e.g. the "skip to content" link, #how-it-works) are not
  // routes — ignore them so the router never 404s on a section jump.
  if (raw && !raw.startsWith('/')) return null
  return raw.length ? raw : '/'
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [hash, setHash] = useState(() => currentHash() ?? '/')
  const firstRender = useRef(true)

  useEffect(() => {
    const onHash = () => {
      const next = currentHash()
      if (next !== null) setHash(next)
    }
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.replace('#/')
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Hash links navigate without JS, so the scroll reset lives in the router.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [hash])

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
    if (window.location.hash === target) return
    if (opts?.replace) window.location.replace(target)
    else window.location.hash = target
  }, [])

  const value = useMemo<RouterCtx>(() => {
    const [path, qs] = hash.split('?')
    return { path: path || '/', query: new URLSearchParams(qs || ''), navigate }
  }, [hash, navigate])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useRouter = () => useContext(Ctx)

/** Match "/rooms/:id" against the current path. Returns params or null. */
export function useMatch(pattern: string): Record<string, string> | null {
  const { path } = useRouter()
  return useMemo(() => matchPath(pattern, path), [pattern, path])
}

export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean)
  const cp = path.split('/').filter(Boolean)
  if (pp.length !== cp.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(cp[i])
    else if (pp[i] !== cp[i]) return null
  }
  return params
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

/** Accessible link that works with the hash router (and degrades gracefully). */
export function Link({ to, children, ...rest }: LinkProps) {
  const href = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

/** Scroll to a section id on the current page (used by footer / how-it-works). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
