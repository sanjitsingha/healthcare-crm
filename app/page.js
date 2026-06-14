import { createClient } from '@/lib/supabase/server'
import LandingPage from './LandingPage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let homeHref = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    homeHref = profile?.organization_id ? '/dashboard' : '/setup'
  }

  return <LandingPage loggedIn={!!user} homeHref={homeHref} />
}
