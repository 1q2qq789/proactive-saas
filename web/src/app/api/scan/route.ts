// web/src/app/api/scan/route.ts
// Scan API — 执行扫描并返回结构化 JSON 结果

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* ignore */ }
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { content, title, mode = 'keyword' } = body

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  }

  try {
    const startTime = Date.now()
    const pythonCmd = process.env.PYTHON_PATH || '/Users/simon/workspace/.venv/bin/python3'
    const scannerPath = '/Users/simon/.hermes/skills/proactive-scanner/scripts/scanner.py'

    // Use the scanner module directly with scan_content_json
    const script = `
import json, sys
sys.path.insert(0, '${scannerPath.replace("/scripts/scanner.py", "/scripts")}')
sys.path.insert(0, '${scannerPath.replace("/scripts/scanner.py", "")}')
sys.path.insert(0, '/Users/simon/hermes-agent')
from scanner import scan_content_json
result = scan_content_json(sys.stdin.read(), mode='${mode}')
print(json.dumps(result, ensure_ascii=False))
`

    const result: string = execSync(
      `${pythonCmd} -c ${JSON.stringify(script)}`,
      {
        input: content,
        encoding: 'utf-8',
        timeout: 120000,
        env: {
          ...process.env,
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
          OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
        } as any,
      }
    ) as unknown as string

    const durationMs = Date.now() - startTime
    const scanResult = JSON.parse(result)

    // Store scan result in database
    const { data: scanRecord, error: insertError } = await supabase
      .from('scans')
      .insert({
        user_id: session.user.id,
        title: title || 'Untitled Scan',
        content_source: content.substring(0, 1000),
        mode,
        summary: scanResult.summary,
        issues: scanResult.issues,
        score_avg: scanResult.score_avg,
        score_max: scanResult.score_max,
        duration_ms: durationMs,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save scan:', insertError)
    }

    return NextResponse.json({
      id: scanRecord?.id || null,
      summary: scanResult.summary,
      issues: scanResult.issues,
      score_avg: scanResult.score_avg,
      score_max: scanResult.score_max,
      duration_ms: durationMs,
    })
  } catch (err: any) {
    console.error('Scan error:', err)
    return NextResponse.json({
      error: err.stderr || err.message || 'Scan failed',
    }, { status: 500 })
  }
}
