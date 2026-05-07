// web/src/app/agents/page.tsx
import { createServerSideClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const supabase = await createServerSideClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your scanning agents
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {(!agents || agents.length === 0) ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <p className="text-[var(--text-secondary)] mb-4">No agents created yet.</p>
          <Link
            href="/agents/new"
            className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Create your first Agent
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
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{agent.name}</h3>
                  {agent.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{agent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">
                    Created {new Date(agent.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>{agent.checklists?.length || 0} checklists</span>
                {agent.notification_channels?.length > 0 && (
                  <span>{agent.notification_channels.length} notifications</span>
                )}
                {agent.schedule && <span>Cron: {agent.schedule}</span>}
                {agent.last_run_at && (
                  <span>Last run: {new Date(agent.last_run_at).toLocaleString()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
