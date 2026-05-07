// web/src/app/api/intent/route.ts
// Intent Analysis API — 分析用户意图并返回主动建议
//
// POST /api/intent
// Body: { userIntent: string, contextContent?: string }
// Response: { insights: string[], risks: [...], suggestions: string[], nextScanTarget: string|null }

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: Request) {
  const body = await request.json()
  const { userIntent, contextContent } = body

  if (!userIntent) {
    return NextResponse.json({ error: 'Missing userIntent' }, { status: 400 })
  }

  try {
    const pythonCmd = process.env.PYTHON_PATH || 'python3'

    // Use pip-installed proactive-scanner package, or fallback to local path
    const script = `
import json, sys
sys.path.insert(0, '/Users/simon/workspace/proactive-scanner-cli/src')
try:
    from proactive_scanner.intent_engine import analyze_intent
    intent = ${JSON.stringify(userIntent)}
    context = ${JSON.stringify(contextContent || '')}
    result = analyze_intent(user_intent=intent, context_content=context)
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}, ensure_ascii=False))
    sys.exit(1)
`
    const result: string = execSync(
      `${pythonCmd} -c ${JSON.stringify(script)}`,
      {
        encoding: 'utf-8',
        timeout: 10000,
      }
    ) as unknown as string

    return NextResponse.json(JSON.parse(result))
  } catch (err: any) {
    console.error('Intent analysis error:', err)
    return NextResponse.json({
      error: err.stderr || err.message || 'Intent analysis failed',
    }, { status: 500 })
  }
}
