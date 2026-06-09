import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseDevice } from '@/lib/device'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, full_name')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.organization_id) {
          return NextResponse.redirect(`${origin}/setup`)
        }

        // Audit: OAuth sign-in (best-effort — never block the redirect).
        try {
          const ua = request.headers.get('user-agent') || ''
          const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
          let location = null
          if (ip) {
            try {
              const r = await fetch(`https://ipwho.is/${ip}`)
              const d = await r.json()
              if (d && d.success !== false) location = [d.city, d.region, d.country].filter(Boolean).join(', ') || null
            } catch { /* ignore */ }
          }
          await supabase.from('audit_logs').insert({
            organization_id: profile.organization_id,
            user_id:         user.id,
            actor_name:      profile.full_name || user.user_metadata?.full_name || user.email,
            actor_email:     user.email,
            action:          'login',
            description:     'Signed in',
            metadata:        { method: user.app_metadata?.provider || 'oauth', ip, location, device: parseDevice(ua) },
          })
        } catch { /* ignore audit failures */ }
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
