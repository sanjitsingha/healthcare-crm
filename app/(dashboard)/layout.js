import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrgProvider } from '@/lib/context/OrgContext'
import { SidebarStateProvider } from '@/lib/context/SidebarContext'
import { AIPanelProvider } from '@/lib/context/AIPanelContext'
import Sidebar from '@/components/crm/Sidebar'
import MainContent from '@/components/crm/MainContent'
import ThemeApplier from '@/components/crm/ThemeApplier'
import ToastHost from '@/components/crm/Toast'
import ConfirmHost from '@/components/crm/ConfirmHost'
import CookieBanner from '@/components/crm/CookieBanner'
import InactivityGuard from '@/components/crm/InactivityGuard'
import PageViewLogger from '@/components/crm/PageViewLogger'
import GeoPermissionBanner from '@/components/crm/GeoPermissionBanner'
import RouteGuard from '@/components/crm/RouteGuard'
import { subscriptionAccess } from '@/lib/subscriptions'

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

  // Fetch this user's role → permissions. Null means owner (full access).
  const { data: userRoleRow } = await supabase
    .from('user_roles')
    .select('roles(name, role_permissions(permissions(name)))')
    .eq('user_id', user.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  const userPermissions = userRoleRow
    ? (userRoleRow.roles?.role_permissions || []).map(rp => rp.permissions?.name).filter(Boolean)
    : null
  const userRoleName = userRoleRow?.roles?.name || null
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  // Before the migration is deployed, do not lock existing clinics out.
  const access = subscription ? subscriptionAccess(subscription) : { writable: true, capabilities: ['core', 'reports', 'automation', 'pharmacy', 'roles', 'custom_modules', 'integrations'], seatLimit: null, status: 'active', plan: { name: 'Enterprise' } }

  return (
    <OrgProvider org={profile.organizations} user={user} userPermissions={userPermissions} userRoleName={userRoleName} subscription={subscription} subscriptionAccess={access}>
      <SidebarStateProvider>
        <AIPanelProvider>
          <ThemeApplier />
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent><RouteGuard>{children}</RouteGuard></MainContent>
          </div>
          <ToastHost />
          <ConfirmHost />
          <CookieBanner />
          <InactivityGuard />
          <PageViewLogger />
          <GeoPermissionBanner />
        </AIPanelProvider>
      </SidebarStateProvider>
    </OrgProvider>
  )
}
