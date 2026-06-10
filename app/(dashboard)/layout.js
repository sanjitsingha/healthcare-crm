import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrgProvider } from '@/lib/context/OrgContext'
import { SidebarStateProvider } from '@/lib/context/SidebarContext'
import Sidebar from '@/components/crm/Sidebar'
import MainContent from '@/components/crm/MainContent'
import ThemeApplier from '@/components/crm/ThemeApplier'
import ToastHost from '@/components/crm/Toast'
import CookieBanner from '@/components/crm/CookieBanner'
import InactivityGuard from '@/components/crm/InactivityGuard'
import PageViewLogger from '@/components/crm/PageViewLogger'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) redirect('/setup')

  return (
    <OrgProvider org={profile.organizations} user={user}>
      <SidebarStateProvider>
        <ThemeApplier />
        <div className="flex min-h-screen">
          <Sidebar />
          <MainContent>{children}</MainContent>
        </div>
        <ToastHost />
        <CookieBanner />
        <InactivityGuard />
        <PageViewLogger />
      </SidebarStateProvider>
    </OrgProvider>
  )
}
