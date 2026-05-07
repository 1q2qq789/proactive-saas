// web/src/app/dashboard/page.tsx
import { createServerSideClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSideClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  const agentCount = agents?.length || 0
  const healthyCount = agents?.filter(a => a.last_run_at).length || 0
  const neverRun = agents?.filter(a => !a.last_run_at).length || 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Agents', value: agentCount, color: 'var(--accent)' },
          { label: 'Healthy (recently run)', value: healthyCount, color: 'var(--green)' },
          { label: 'Never Run', value: neverRun, color: neverRun > 0 ? 'var(--yellow)' : 'var(--text-muted)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5"
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent List */}
      <h2 className="text-lg font-semibold mb-4">Agents</h2>

      {(!agents || agents.length === 0) ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <p className="text-[var(--text-secondary)] mb-4">No agents yet. Create your first one!</p>
          <Link
            href="/agents/new"
            className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            + Create Agent
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="block rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{agent.name}</h3>
                  {agent.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {agent.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge lastRun={agent.last_run_at} />
                  <span className="text-xs text-[var(--text-muted)]">
                    {agent.checklists?.length || 0} checks
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                {agent.schedule && <span>Schedule: {agent.schedule}</span>}
                {agent.notification_channels?.length > 0 && (
                  <span>{agent.notification_channels.length} channel(s)</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ lastRun }: { lastRun: string | null }) {
  if (!lastRun) {
    return <span className="rounded-full bg-[var(--yellow-bg)] px-2 py-0.5 text-xs text-[var(--yellow)]">Never</span>
  }

  const hours = (Date.now() - new Date(lastRun).getTime()) / 3600000
  if (hours < 24) {
    return <span className="rounded-full bg-[var(--green-bg)] px-2 py-0.5 text-xs text-[var(--green)]">Active</span>
  }
  return <span className="rounded-full bg-[var(--yellow-bg)] px-2 py-0.5 text-xs text-[var(--yellow)]">Stale</span>
}
