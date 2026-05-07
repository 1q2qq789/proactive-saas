// web/src/components/Navbar.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/settings', label: 'Settings' },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  // 不显示在 auth 页面
  if (pathname?.startsWith('/auth')) return null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 font-semibold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent)] text-[10px] font-bold text-white">
              PS
            </span>
            <span className="hidden sm:inline">Proactive Scanner</span>
          </a>

          {user && (
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname?.startsWith(item.href)
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      active
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {item.label}
                  </a>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}
