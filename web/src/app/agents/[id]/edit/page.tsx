// web/src/app/agents/[id]/edit/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

interface Agent {
  id: string
  name: string
  description: string | null
  checklists: any[]
  notification_channels: any[]
  schedule: string | null
}

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{ type: string; label: string; value: string }[]>([])

  const agentId = params?.id as string

  useEffect(() => {
    supabase.from('agents').select('*').eq('id', agentId).single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Agent not found')
          setLoading(false)
          return
        }
        const agent = data as Agent
        setName(agent.name)
        setDescription(agent.description || '')
        setSchedule(agent.schedule || '')
        setSelectedItems(new Set((agent.checklists || []).map((c: any) => c.id)))
        setNotifications((agent.notification_channels || []).map((c: any) => ({
          type: c.type,
          label: c.label,
          value: c.value,
        })))
        setLoading(false)
      })
  }, [agentId, supabase])

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedItems(next)
  }

  const addChannel = () => setNotifications([...notifications, { type: 'telegram', label: '', value: '' }])

  const updateChannel = (i: number, field: string, val: string) => {
    const next = [...notifications]
    ;(next[i])[field] = val
    setNotifications(next)
  }

  const removeChannel = (i: number) => setNotifications(notifications.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const allItems = BUILTIN_CHECKLISTS.flatMap(g => g.items)
    const checklists = allItems.filter(item => selectedItems.has(item.id)).map(item => ({ ...item, enabled: true }))
    const channels = notifications.filter(n => n.value.trim()).map(n => ({ ...n, enabled: true }))

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        name,
        description,
        checklists,
        notification_channels: channels,
        schedule: schedule || null,
      })
      .eq('id', agentId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/agents/${agentId}`)
    router.refresh()
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--text-muted)]">Loading...</div>
  if (error && !name) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--red)]">{error}</div>

  const allItems = BUILTIN_CHECKLISTS.flatMap(g => g.items)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Agent</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <h2 className="font-semibold text-sm">Basic Info</h2>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Agent Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Schedule (cron)</label>
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 */6 * * *"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

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
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Notifications</h2>
            <button type="button" onClick={addChannel} className="text-xs text-[var(--accent)]">+ Add channel</button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No channels configured.</p>
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
                  placeholder="Value" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs" />
                <button type="button" onClick={() => removeChannel(i)} className="text-xs text-[var(--red)]">✕</button>
              </div>
            ))
          )}
        </div>

        {error && <div className="text-xs text-[var(--red)] bg-[var(--red-bg)] rounded-lg px-4 py-3">{error}</div>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || !name}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <a href={`/agents/${agentId}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</a>
        </div>
      </form>
    </div>
  )
}
