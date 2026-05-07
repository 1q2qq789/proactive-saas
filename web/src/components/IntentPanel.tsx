// web/src/components/IntentPanel.tsx
// 实时意图面板 — 根据用户当前输入内容，实时分析并给出主动建议

'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/browser'
import type { IntentOutput } from '@/lib/intent-engine'
import { analyzeIntent } from '@/lib/intent-engine'

interface Props {
  content: string           // 用户当前输入的内容（实时传入）
  userIntent?: string       // 用户自己描述的场景（可选）
  onScanRequest?: (path: string) => void
}

export default function IntentPanel({ content, userIntent, onScanRequest }: Props) {
  const supabase = createClient()
  const [analysis, setAnalysis] = useState<IntentOutput | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // 每次 content/userIntent 变化时，防抖 1.5s 后分析
  useEffect(() => {
    if (!content && !userIntent) {
      setShow(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      // 如果用户还没打几个字，不做分析
      const text = content || userIntent || ''
      if (text.length < 10) {
        setShow(false)
        return
      }

      // 获取扫描历史
      const { data: recentScans } = await supabase
        .from('scans')
        .select('title, issues')
        .order('created_at', { ascending: false })
        .limit(5)

      const scanHistory = (recentScans || []).map((s: any) => ({
        filePath: s.title || 'unknown',
        issues: (s.issues as any[]) || [],
      }))

      // 用意图引擎分析
      const intent = userIntent || content.substring(0, 100)
      const dummyFiles = []
      if (content.length > 50) {
        dummyFiles.push({
          path: 'current-content',
          content: content.substring(0, 500),
        })
      }

      const result = analyzeIntent({
        userIntent: intent,
        contextFiles: dummyFiles,
        scanHistory,
      })

      // 只有有实际发现时才展示
      if (result.insights.length > 0 || result.risks.length > 0) {
        setAnalysis(result)
        setShow(true)
      } else {
        setShow(false)
      }
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content, userIntent])

  if (!show || dismissed) return null

  return (
    <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-bg)] p-3 mb-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs">💡</span>
          <span className="font-semibold text-xs">我发现了一些你可以关注的点</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ✕
        </button>
      </div>

      {/* Insights */}
      {analysis && analysis.insights.length > 0 && (
        <div className="mb-2">
          {analysis.insights.map((insight, i) => (
            <p key={i} className="text-xs text-[var(--text-secondary)]">
              • {insight}
            </p>
          ))}
        </div>
      )}

      {/* Risks */}
      {analysis && analysis.risks.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {analysis.risks.slice(0, 2).map((risk, i) => (
            <div key={i} className="bg-[var(--bg-primary)] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                  risk.severity === 'high'
                    ? 'bg-[var(--red-bg)] text-[var(--red)]'
                    : risk.severity === 'medium'
                    ? 'bg-[var(--yellow-bg)] text-[var(--yellow)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                }`}>
                  {risk.severity.toUpperCase()}
                </span>
                <span className="text-xs text-[var(--text-primary)]">{risk.description}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] ml-1">{risk.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis && analysis.suggestions.length > 0 && (
        <p className="text-xs text-[var(--accent)]">
          💡 {analysis.suggestions[0]}
        </p>
      )}
    </div>
  )
}
