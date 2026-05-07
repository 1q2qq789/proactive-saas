// web/src/app/agents/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

const BUILTIN_CHECKLISTS = [
  {
    id: 'data_quality', name: 'Data Quality',
    items: [
      { id: 'undefined_numbers', name: 'Undefined numbers/percentages', severity: 'error', weight: 9 },
      { id: 'data_source_validity', name: 'Data source validity', severity: 'warning', weight: 7 },
      { id: 'data_conflict', name: 'Data conflict detection', severity: 'error', weight: 10 },
      { id: 'undefined_terms', name: 'Undefined terms/abbreviations', severity: 'warning', weight: 5 },
    ],
  },
  {
    id: 'logic_integrity', name: 'Logic Integrity',
    items: [
      { id: 'blind_spots', name: 'Blind spots (follow-up questions)', severity: 'error', weight: 8 },
      { id: 'logic_chain_gap', name: 'Logic chain gaps', severity: 'warning', weight: 7 },
      { id: 'assumption_check', name: 'Hidden assumptions', severity: 'warning', weight: 6 },
    ],
  },
  {
    id: 'consistency', name: 'Consistency',
    items: [
      { id: 'cross_reference', name: 'Cross-reference consistency', severity: 'error', weight: 8 },
      { id: 'version_conflict', name: 'Version/timeline conflict', severity: 'error', weight: 9 },
      { id: 'tone_style', name: 'Tone/style consistency', severity: 'warning', weight: 3 },
    ],
  },
  {
    id: 'environment', name: 'Environment Health',
    items: [
      { id: 'git_status', name: 'Git status check', severity: 'warning', weight: 6 },
      { id: 'env_files', name: 'Environment variable completeness', severity: 'warning', weight: 5 },
      { id: 'temp_files', name: 'Temp file cleanup', severity: 'info', weight: 2 },
    ],
  },
  {
    id: 'code_quality', name: 'Code Quality',
    items: [
      { id: 'hardcoded_secrets', name: 'Hardcoded secrets/credentials', severity: 'error', weight: 10 },
      { id: 'error_handling', name: 'Error handling completeness', severity: 'error', weight: 9 },
      { id: 'api_security', name: 'API security (RLS, SQL injection)', severity: 'error', weight: 10 },
      { id: 'data_validation', name: 'Data input validation', severity: 'warning', weight: 8 },
      { id: 'config_management', name: 'Configuration management', severity: 'warning', weight: 5 },
    ],
  },
]

export default function NewAgentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set([
    'undefined_numbers', 'data_conflict', 'blind_spots',
    'cross_reference', 'version_conflict', 'hardcoded_secrets',
    'api_security', 'error_handling',
  ]))
  const [notifications, setNotifications] = useState<{ type: string; label: string; value: string }[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedItems(next)
  }

  const addChannel = () => {
    setNotifications([...notifications, { type: 'telegram', label: '', value: '' }])
  }

  const removeChannel = (i: number) => {
    setNotifications(notifications.filter((_, idx) => idx !== i))
  }

  const updateChannel = (i: number, field: string, val: string) => {
    const next = [...notifications]
    ;(next[i] as any)[field] = val
    setNotifications(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const allItems = BUILTIN_CHECKLISTS.flatMap(g => g.items)
    const checklists = allItems.filter(item => selectedItems.has(item.id)).map(item => ({ ...item, enabled: true }))
    const channels = notifications.filter(n => n.value.trim()).map(n => ({ ...n, enabled: true }))

    const payload = { name, description, checklists, notification_channels: channels, schedule: schedule || null }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setLoading(false); return }

    // Ensure user exists
    await supabase.from('users').upsert({
      id: user.id, email: user.email || '', name: user.user_metadata?.name || '',
    }, { onConflict: 'id' }).maybeSingle()

    const { data, error: insertError } = await supabase
      .from('agents')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()

    if (insertError) { setError(insertError.message); setLoading(false); return }

    router.push(`/agents/${(data as any).id}`)
    router.refresh()
  }

  const allItems = BUILTIN_CHECKLISTS.flatMap(g => g.items)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Agent</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Configure a new scanning agent</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <h2 className="font-semibold text-sm">Basic Info</h2>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Agent Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., My Blog Scanner" required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this agent scan?" rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Schedule (cron)</label>
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 */6 * * *"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
            <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for manual scanning</p>
          </div>
        </div>

        {/* Checklists */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Checklists ({selectedItems.size}/{allItems.length})</h2>
            <button type="button" onClick={() => {
              if (selectedItems.size === allItems.length) setSelectedItems(new Set())
              else setSelectedItems(new Set(allItems.map(i => i.id)))
            }} className="text-xs text-[var(--accent)]">{selectedItems.size === allItems.length ? 'Deselect all' : 'Select all'}</button>
          </div>
          {BUILTIN_CHECKLISTS.map((group) => (
            <div key={group.id} className="mb-4">
              <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">{group.name}</h3>
              {group.items.map((item) => (
                <label key={item.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 cursor-pointer hover:bg-[var(--bg-hover)]">
                  <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleItem(item.id)}
                    className="rounded border-[var(--border)] accent-[var(--accent)]" />
                  <span className="text-xs flex-1">{item.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    item.severity === 'error' ? 'bg-[var(--red-bg)] text-[var(--red)]' : 'bg-[var(--yellow-bg)] text-[var(--yellow)]'
                  }`}>{item.severity}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Notifications</h2>
            <button type="button" onClick={addChannel} className="text-xs text-[var(--accent)]">+ Add channel</button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No notification channels.</p>
          ) : (
            notifications.map((ch, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select value={ch.type} onChange={(e) => updateChannel(i, 'type', e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs">
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
                <input type="text" value={ch.value} onChange={(e) => updateChannel(i, 'value', e.target.value)}
                  placeholder={ch.type === 'telegram' ? 'Chat ID' : ch.type === 'discord' ? 'Webhook URL' : 'Email'}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs" />
                <button type="button" onClick={() => removeChannel(i)} className="text-xs text-[var(--red)]">X</button>
              </div>
            ))
          )}
        </div>

        {error && <div className="text-xs text-[var(--red)] bg-[var(--red-bg)] rounded-lg px-4 py-3">{error}</div>}

        <button type="submit" disabled={loading || !name}
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  )
}
