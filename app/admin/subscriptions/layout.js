import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSubscriptionAdmin } from '@/lib/supabase/admin'

export default async function SubscriptionAdminLayout({ children }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isSubscriptionAdmin(user.email)) redirect('/dashboard')
  return children
}
