// web/src/app/api/scan/route.ts
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

  const { content, mode = 'keyword', agent_id } = await request.json()
  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  }

  try {
    const pythonCmd = process.env.PYTHON_PATH || 'python3'
    const result: string = execSync(
      `${pythonCmd} -m proactive_scanner.cli --mode ${mode} --stdin`,
      {
        input: content,
        encoding: 'utf-8',
        timeout: 120000,
        env: {
          ...process.env,
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
          OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
        },
      }
    ) as unknown as string

    if (agent_id) {
      await supabase
        .from('agents')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', agent_id)
        .eq('user_id', session.user.id)
    }

    return NextResponse.json({ report: result })
  } catch (err: any) {
    console.error('Scan error:', err)
    return NextResponse.json({
      error: err.stderr || err.message || 'Scan failed',
    }, { status: 500 })
  }
}
