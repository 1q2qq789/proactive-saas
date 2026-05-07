// web/src/components/IntentPanel.tsx
// 意图面板 — 用户一进入页面就显示主动建议

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import type { IntentOutput } from '@/lib/intent-engine'
import { analyzeIntent } from '@/lib/intent-engine'

export default function IntentPanel({ onScan }: { onScan?: (path: string) => void }) {
  const supabase = createClient()
  const [analysis, setAnalysis] = useState<IntentOutput | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalysis()
  }, [])

  const loadAnalysis = async () => {
    setLoading(true)

    // 获取当前用户信息
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // 获取最近的 Agent 和扫描记录
    const { data: agents } = await supabase
      .from('agents')
      .select('name, checklists')
      .order('updated_at', { ascending: false })
      .limit(3)

    const { data: recentScans } = await supabase
      .from('scans')
      .select('title, issues')
      .order('created_at', { ascending: false })
      .limit(5)

    // 构建 context — 从用户的项目和扫描历史推理
    const contextFiles = (agents || []).map((a: any) => ({
      path: `Agent: ${a.name}`,
      content: JSON.stringify(a.checklists || []),
    }))

    const scanHistory = (recentScans || []).map((s: any) => ({
      filePath: s.title || 'unknown',
      issues: (s.issues as any[]) || [],
    }))

    // 用意图引擎分析
    const result = analyzeIntent({
      userIntent: '研报 分析 文档', // 默认场景，可在页面中动态更新
      contextFiles: contextFiles.length > 0 ? contextFiles : [
        { path: 'no files yet', content: '' }
      ],
      scanHistory,
    })

    setAnalysis(result)
    setLoading(false)
  }

  if (loading) return null

  if (!analysis || (analysis.insights.length === 0 && analysis.risks.length === 0)) {
    return null
  }

  return (
    <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-bg)] p-4 mb-6 animate-fadeIn">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">💡</span>
        <span className="font-semibold text-sm">Intent Insights</span>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="mb-3">
          {analysis.insights.map((insight, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)] mb-1">
              • {insight}
            </p>
          ))}
        </div>
      )}

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-[var(--yellow)]">⚠ 需要注意</p>
          {analysis.risks.map((risk, i) => (
            <div key={i} className="bg-[var(--bg-primary)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  risk.severity === 'high'
                    ? 'bg-[var(--red-bg)] text-[var(--red)]'
                    : risk.severity === 'medium'
                    ? 'bg-[var(--yellow-bg)] text-[var(--yellow)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                }`}>
                  {risk.severity === 'high' ? 'High' : risk.severity === 'medium' ? 'Med' : 'Low'}
                </span>
                <span className="text-xs">{risk.description}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] ml-1">
                💡 {risk.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--accent)]">建议下一步</p>
          {analysis.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)]">
              {i + 1}. {s}
            </p>
          ))}
        </div>
      )}

      {/* Quick scan button */}
      {analysis.nextScanPath && onScan && (
        <button
          onClick={() => onScan(analysis.nextScanPath!)}
          className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Scan suggested file →
        </button>
      )}
    </div>
  )
}
