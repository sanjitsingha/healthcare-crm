import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPage from './LandingPage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    redirect(profile?.organization_id ? '/dashboard' : '/setup')
  }

  return <LandingPage />
}
