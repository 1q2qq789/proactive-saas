// web/src/app/agents/[id]/page.tsx
// Agent detail page

import { createServerSideClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AgentDetailClient from './AgentDetailClient'

export const dynamic = 'force-dynamic'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSideClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (!agent) {
    notFound()
  }

  return <AgentDetailClient agent={agent} />
}
