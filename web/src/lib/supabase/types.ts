// web/src/lib/supabase/types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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

export interface UserRecord {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  scan_quota_remaining: number
  llm_quota_remaining: number
  is_pro: boolean
  created_at: string
}

export interface ScanRecord {
  id: string
  user_id: string
  title: string | null
  content_source: string | null
  mode: 'keyword' | 'llm'
  summary: {
    total_checks: number
    passed: number
    warnings: number
    errors: number
  }
  issues: ScanIssue[]
  score_avg: number | null
  score_max: number | null
  duration_ms: number | null
  created_at: string
}

export interface ScanIssue {
  id: string
  name: string
  score: number
  severity: 'warning' | 'error'
  detail: string
  suggestion: string | null
}

export type NotificationChannel = {
  type: 'telegram' | 'discord' | 'email' | 'webhook'
  label: string
  value: string
  enabled: boolean
}

export type ChecklistItem = {
  id: string
  name: string
  enabled: boolean
  severity: 'warning' | 'error' | 'info'
  weight: number
}
