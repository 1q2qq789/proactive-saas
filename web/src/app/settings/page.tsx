// web/src/app/settings/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Account and API configuration</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h2 className="font-semibold text-sm mb-4">Profile</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-[var(--text-muted)] text-xs">Email</span>
              <p>{user?.email || '-'}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-xs">User ID</span>
              <div className="flex items-center gap-2">
                <code className="text-xs text-[var(--accent)]">{user?.id || '-'}</code>
                <button onClick={handleCopyUserId} className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CLI Usage */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h2 className="font-semibold text-sm mb-4">CLI Quick Start</h2>
          <div className="space-y-2 text-xs">
            <p className="text-[var(--text-muted)]">Install the CLI and run scans from your terminal:</p>
            <div className="bg-[var(--bg-primary)] rounded-lg p-3 space-y-2">
              <code className="block">pip install proactive-scanner</code>
              <code className="block">proactive-scan --mode keyword --file README.md</code>
              <code className="block">proactive-scan --mode llm --file document.md</code>
            </div>
            <p className="text-[var(--text-muted)]">Set your API key:</p>
            <div className="bg-[var(--bg-primary)] rounded-lg p-3">
              <code className="block">export DEEPSEEK_API_KEY=your_key_here</code>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] p-5">
          <h2 className="font-semibold text-sm mb-2 text-[var(--red)]">Danger Zone</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Sign out of your account. Your agents will be preserved.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            className="rounded-lg border border-[var(--red)]/30 px-4 py-1.5 text-xs text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
