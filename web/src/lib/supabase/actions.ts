// web/src/lib/supabase/actions.ts
// 服务端 Action — 用户和 Agent 的增删改查

'use server'

import { createServerSideClient } from './server'
import { revalidatePath } from 'next/cache'

// ── Auth ──────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const supabase = await createServerSideClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = await createServerSideClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) return { error: error.message }

  // 如果 signUp 成功且需要邮箱验证，返回提醒
  return { error: null, message: '请检查邮箱完成验证' }
}

export async function signOut() {
  const supabase = await createServerSideClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

export async function getSession() {
  const supabase = await createServerSideClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Agents ───────────────────────────────────────────

export async function createAgent(formData: FormData) {
  const supabase = await createServerSideClient()

  const payload = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    checklists: JSON.parse((formData.get('checklists') as string) || '[]'),
    notification_channels: JSON.parse((formData.get('notification_channels') as string) || '[]'),
    schedule: formData.get('schedule') as string || null,
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  // 先确保 users 表有此用户
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    await supabase.from('users').insert({
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email,
    })
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/agents')
  return { data }
}

export async function updateAgent(agentId: string, formData: FormData) {
  const supabase = await createServerSideClient()

  const payload: Record<string, any> = {}
  const name = formData.get('name')
  if (name) payload.name = name
  const description = formData.get('description')
  if (description) payload.description = description
  const checklists = formData.get('checklists')
  if (checklists) payload.checklists = JSON.parse(checklists as string)
  const notification_channels = formData.get('notification_channels')
  if (notification_channels) payload.notification_channels = JSON.parse(notification_channels as string)
  const schedule = formData.get('schedule')
  if (schedule !== null) payload.schedule = (schedule as string) || null

  const { error } = await supabase
    .from('agents')
    .update(payload)
    .eq('id', agentId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/agents')
  revalidatePath(`/agents/${agentId}`)
  return { error: null }
}

export async function deleteAgent(agentId: string) {
  const supabase = await createServerSideClient()
  const { error } = await supabase.from('agents').delete().eq('id', agentId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/agents')
  return { error: null }
}

export async function runScanNow(agentId: string) {
  const supabase = await createServerSideClient()
  // 触发扫描，更新 last_run_at
  const { error } = await supabase
    .from('agents')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', agentId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}
