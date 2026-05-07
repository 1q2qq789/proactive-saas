// web/src/app/agents/[id]/AgentDetailClient.tsx
'use client'
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useState } from 'react'

interface Agent {
  id: string
  name: string
  description: string | null
  checklists: any[]
  notification_channels: any[]
  schedule: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export default function AgentDetailClient({ agent }: { agent: Agent }) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const checklists: any[] = (agent.checklists || []) as any[]
  const channels: any[] = (agent.notification_channels || []) as any[]

  const handleDelete = async () => {
    if (!confirm('Delete this agent? This cannot be undone.')) return
    setDeleting(true)
    const { error } = await supabase.from('agents').delete().eq('id', agent.id)
    if (error) {
      alert('Failed to delete: ' + error.message)
      setDeleting(false)
      return
    }
    router.push('/agents')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          {agent.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{agent.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/agents/${agent.id}/edit`}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Edit
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-1.5 text-xs text-[var(--red)] hover:bg-[var(--red)]/20 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Schedule</div>
          <div className="text-sm">{agent.schedule || 'Manual only'}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Last Run</div>
          <div className="text-sm">
            {agent.last_run_at
              ? new Date(agent.last_run_at).toLocaleString()
              : 'Never'}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Created</div>
          <div className="text-sm">{new Date(agent.created_at).toLocaleDateString()}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Updated</div>
          <div className="text-sm">{new Date(agent.updated_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Checklists */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
        <h2 className="font-semibold text-sm mb-3">Checklists ({checklists.length})</h2>
        {checklists.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No checklists configured.</p>
        ) : (
          <div className="space-y-2">
            {checklists.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span>{item.name || item.id || `Item ${i + 1}`}</span>
                <span className={item.severity === 'error' ? 'text-[var(--red)]' : 'text-[var(--yellow)]'}>
                  {item.severity || 'warning'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h2 className="font-semibold text-sm mb-3">Notifications ({channels.length})</h2>
        {channels.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No notification channels configured.</p>
        ) : (
          <div className="space-y-2">
            {channels.map((ch: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ChannelIcon type={ch.type} />
                  <span>{ch.label || ch.type}</span>
                </div>
                <span className="text-[var(--text-muted)]">{ch.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    telegram: '✈️',
    discord: '💬',
    email: '📧',
    webhook: '🔗',
  }
  return <span>{icons[type] || '📡'}</span>
}
