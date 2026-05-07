// web/src/app/scan/page.tsx
// Scan page — 上传内容 → 选择检查项 → 执行扫描 → 查看结果

'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/browser'
import IntentPanel from '@/components/IntentPanel'

interface ScanIssue {
  id: string
  name: string
  score: number
  severity: 'error' | 'warning'
  detail: string
  suggestion: string | null
}

interface ScanSummary {
  total_checks: number
  passed: number
  warnings: number
  errors: number
}

export default function ScanPage() {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'keyword' | 'llm'>('keyword')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    summary: ScanSummary
    issues: ScanIssue[]
    score_avg: number
    score_max: number
    duration_ms: number
    id: string | null
  } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTitle(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setContent(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  const handleScan = async () => {
    if (!content.trim()) return
    setScanning(true)
    setError('')
    setResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Please sign in first')
      setScanning(false)
      return
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: title || 'Untitled Scan', mode }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed')
    }

    setScanning(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Scan</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Paste your content or upload a file to scan for quality issues
        </p>
      </div>
      <IntentPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h2 className="font-semibold text-sm mb-4">Content</h2>

            {/* Title */}
            <div className="mb-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title (optional)"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* File upload */}
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                + Upload file (.md, .txt, .html)
              </button>
            </div>

            {/* Text area */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content here..."
              rows={18}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
            />
          </div>

          {/* Mode + Scan button */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)]">Mode:</span>
                {(['keyword', 'llm'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      mode === m
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {m === 'keyword' ? 'Keyword (free)' : 'LLM (deep scan)'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || !content.trim()}
                className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                {scanning ? 'Scanning...' : 'Scan'}
              </button>
            </div>
            {mode === 'llm' && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                LLM mode uses DeepSeek for deeper semantic analysis. May take 30-60 seconds.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-[var(--red-bg)] border border-[var(--red)]/30 px-4 py-3">
              <p className="text-xs text-[var(--red)]">{error}</p>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div>
          {scanning && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
              <div className="text-2xl mb-2 animate-pulse">🔍</div>
              <p className="text-sm text-[var(--text-secondary)]">Scanning content...</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">This may take a moment</p>
            </div>
          )}

          {result && !scanning && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <SummaryCard label="Total" value={result.summary.total_checks} color="var(--text-primary)" />
                <SummaryCard label="Passed" value={result.summary.passed} color="var(--green)" />
                <SummaryCard label="Warnings" value={result.summary.warnings} color="var(--yellow)" />
                <SummaryCard label="Issues" value={result.summary.errors} color="var(--red)" />
              </div>

              {/* Score + duration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
                  <div className="text-lg font-bold" style={{ color: result.score_max >= 400 ? 'var(--red)' : result.score_max >= 200 ? 'var(--yellow)' : 'var(--green)' }}>
                    {result.score_max}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Max Risk Score</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
                  <div className="text-lg font-bold text-[var(--text-primary)]">{result.score_avg}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Avg Risk Score</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
                  <div className="text-lg font-bold text-[var(--text-primary)]">{(result.duration_ms / 1000).toFixed(1)}s</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Duration</div>
                </div>
              </div>

              {/* Issues list */}
              {result.issues.length === 0 ? (
                <div className="rounded-lg border border-[var(--green)]/30 bg-[var(--green-bg)] p-8 text-center">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="font-medium text-sm">All checks passed!</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">No issues found in your content.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} />
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && !scanning && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="text-4xl mb-4 opacity-30">📋</div>
              <p className="text-sm text-[var(--text-muted)]">Enter content and click Scan to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

function IssueCard({ issue }: { issue: ScanIssue }) {
  const [expanded, setExpanded] = useState(false)
  const isError = issue.severity === 'error'

  return (
    <div
      className={`rounded-lg border cursor-pointer transition-colors ${
        isError ? 'border-[var(--red)]/30 bg-[var(--red-bg)]' : 'border-[var(--yellow)]/30 bg-[var(--yellow-bg)]'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span>{isError ? '🔴' : '🟡'}</span>
            <span className="font-medium text-sm">{issue.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={isError ? 'text-[var(--red)]' : 'text-[var(--yellow)]'}>
              {issue.severity === 'error' ? 'Error' : 'Warning'}
            </span>
            <span className="text-[var(--text-muted)]">Score: {issue.score}</span>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 text-xs">
            <div className="bg-[var(--bg-primary)] rounded-lg p-3">
              <span className="text-[var(--text-muted)]">Detail:</span>
              <p className="mt-1 text-[var(--text-secondary)]">{issue.detail}</p>
            </div>
            {issue.suggestion && (
              <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--accent)]/20">
                <span className="text-[var(--accent)]">Suggestion:</span>
                <p className="mt-1 text-[var(--text-secondary)]">{issue.suggestion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
