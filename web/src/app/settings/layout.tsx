// web/src/app/settings/layout.tsx
import { createServerSideClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSideClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')
  return <>{children}</>
}
