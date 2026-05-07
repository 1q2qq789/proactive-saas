// web/src/lib/supabase/types.ts
// 数据库类型定义 — 用于 IDE 提示，实际运行时用宽类型

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Simplified type for agent record used across the app
export interface AgentRecord {
  id: string
  user_id: string
  name: string
  description: string | null
  checklists: any[]
  notification_channels: any[]
  schedule: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string
}

// Simplified type for user record
export interface UserRecord {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

// Notification channel type
export type NotificationChannel = {
  type: 'telegram' | 'discord' | 'email' | 'webhook'
  label: string
  value: string
  enabled: boolean
}

// Checklist item
export type ChecklistItem = {
  id: string
  name: string
  enabled: boolean
  severity: 'warning' | 'error' | 'info'
  weight: number
}
