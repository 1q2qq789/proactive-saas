// web/src/lib/intent-engine/index.ts
// 意图引擎 — 分析用户输入，预判需求，主动生成建议
//
// 核心思想：
// 用户做一件事时，不只看他/她说了什么，
// 还要看：用户在什么场景下、当前有什么资源、历史上有什么产出、这个领域有什么常见的风险。
//
// 三个输入：
//   1. user_intent     — 用户当前表达的方向（如"我在准备面试"、"帮我写研报"）
//   2. context_files   — 当前项目中相关的文件内容
//   3. scan_history    — 最近对该项目的扫描结果（如果有）
//
// 输出：
//   {
//     insights: string[],      // 我发现的情况
//     risks: { description, severity, suggestion }[],   // 需要提醒的问题
//     suggestions: string[],   // 我建议你接下来做的事
//     next_scan_path: string   // 建议下一步扫哪个文件
//   }

export interface IntentInput {
  userIntent: string
  contextFiles: { path: string; content: string }[]
  scanHistory?: { filePath: string; issues: any[] }[]
}

export interface IntentOutput {
  insights: string[]
  risks: { description: string; severity: 'high' | 'medium' | 'low'; suggestion: string }[]
  suggestions: string[]
  nextScanPath: string | null
}

/**
 * 根据用户输入推理意图，生成主动建议。
 *
 * 当前版本使用关键词 + 规则引擎。
 * V2 会使用 LLM 做语义分析。
 */
export function analyzeIntent(input: IntentInput): IntentOutput {
  const insights: string[] = []
  const risks: IntentOutput['risks'] = []
  const suggestions: string[] = []
  let nextScanPath: string | null = null

  const intent = input.userIntent.toLowerCase()

  // ── 场景一：面试准备 ────────────────────────────
  if (intent.includes('面试') || intent.includes('面经') || intent.includes('自我介绍') ||
      intent.includes('star') || intent.includes('面试手册')) {

    insights.push('你正在准备面试，我可以帮你检查 STAR 故事的数据口径和追问盲区')

    // 找有没有 STAR 故事相关的文件
    const starFiles = input.contextFiles.filter(
      f => f.path.toLowerCase().includes('star') || f.path.toLowerCase().includes('面试')
    )
    if (starFiles.length > 0) {
      // 检查 STAR 故事
      for (const f of starFiles) {
        const content = f.content
        // 找常见问题
        if (!content.includes('Situation') && !content.includes('情境')) {
          risks.push({
            description: f.path + ' 缺少 Situation 部分',
            severity: 'high',
            suggestion: '每个 STAR 故事都应该从情境开始，建议补充当时的具体背景'
          })
        }
        // 找数据口径问题
        const numbers = content.match(/(增长|下降|达到|超过|减少|提升)\d+/g)
        if (numbers && numbers.length > 3) {
          risks.push({
            description: f.path + ' 中有 ' + numbers.length + ' 处数字可能缺少口径定义',
            severity: 'medium',
            suggestion: '如"' + numbers[0] + '"需要说明基准是什么、统计范围和时间'
          })
        }
      }
      nextScanPath = starFiles[0].path
    } else {
      suggestions.push('我没有找到你的 STAR 故事文件，要不要先写一份？')
    }
  }

  // ── 场景二：写研报/文档 ──────────────────────────
  if (intent.includes('研报') || intent.includes('报告') || intent.includes('研究') ||
      intent.includes('文档') || intent.includes('分析')) {

    insights.push('你在写分析报告，我建议写完后扫一遍数据质量和逻辑完整性')

    // 找最近的文档
    const docFiles = input.contextFiles.filter(
      f => f.path.endsWith('.md') || f.path.endsWith('.html')
    )
    if (docFiles.length > 0) {
      suggestions.push('建议用 LLM 模式扫描 ' + docFiles[0].path + '，检查数据冲突和逻辑断层')
      nextScanPath = docFiles[0].path
    }

    // 检查扫描历史
    if (input.scanHistory && input.scanHistory.length > 0) {
      const unresolved = input.scanHistory.filter(
        s => s.issues.some((i: any) => i.score && i.score >= 100 && !i.fixed)
      )
      if (unresolved.length > 0) {
        risks.push({
          description: '上次扫描发现 ' + unresolved.length + ' 个未修复的问题',
          severity: 'high',
          suggestion: '建议先修复这些问题再继续写新内容'
        })
      }
    }
  }

  // ── 场景三：写代码/开发 ──────────────────────────
  if (intent.includes('代码') || intent.includes('写') && intent.includes('bug') ||
      intent.includes('开发') || intent.includes('部署') || intent.includes('上线')) {

    insights.push('在做开发，建议检查代码安全和环境配置')

    const codeFiles = input.contextFiles.filter(
      f => f.path.endsWith('.ts') || f.path.endsWith('.py') || f.path.endsWith('.js')
    )
    if (codeFiles.length > 0) {
      suggestions.push('建议扫描 ' + codeFiles[0].path + ' 检查硬编码密钥和错误处理')

      // 检查常见安全风险
      for (const f of codeFiles) {
        if (f.content.includes('service_role') || f.content.includes('supabaseAdmin')) {
          risks.push({
            description: f.path + ' 使用了 Service Role Key，绕过了 RLS',
            severity: 'high',
            suggestion: '建议改用普通客户端并依赖 RLS 策略'
          })
        }
        if (f.content.includes('process.env') && f.content.includes('||')) {
          risks.push({
            description: f.path + ' 中环境变量有默认值回退',
            severity: 'low',
            suggestion: '确认回退值不会导致安全问题'
          })
        }
      }
      nextScanPath = codeFiles[0].path
    }
  }

  // ── 场景四：分享/发布 ────────────────────────────
  if (intent.includes('分享') || intent.includes('发布') || intent.includes('推送') ||
      intent.includes('发') || intent.includes('发文章')) {

    insights.push('你要发布内容，发布前建议做一次完整的质量检查')
    suggestions.push('用 LLM 模式扫描要发的内容，检查数据口径和逻辑链')
  }

  return {
    insights: [...new Set(insights)],
    risks,
    suggestions: [...new Set(suggestions)],
    nextScanPath,
  }
}
