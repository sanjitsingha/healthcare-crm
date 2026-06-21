import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsApp } from '@/lib/messaging/whatsapp'

// Single outbound WhatsApp entry point. Reads the org's provider config
// server-side (so credentials never round-trip through the browser) and calls
// the matching adapter. Reused later by buttons / rules / reminders.
//
// Body: { orgId, to, templateName?, params?, text?, languageCode? }
//   params: array OR comma-separated string of template variable values.

export async function POST(req) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { orgId, to, templateName, text, languageCode } = body || {}
    if (!orgId || !to) {
      return NextResponse.json({ ok: false, error: 'Missing orgId or recipient number (to).' }, { status: 400 })
    }
    const params = Array.isArray(body.params)
      ? body.params
      : String(body.params || '').split(',').map((s) => s.trim()).filter(Boolean)

    const supabase = createAdminClient()
    const { data: org, error } = await supabase
      .from('organizations').select('id, settings').eq('id', orgId).maybeSingle()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!org) return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 })

    const wa = org.settings?.whatsapp
    if (!wa || !wa.provider) {
      return NextResponse.json({ ok: false, error: 'WhatsApp is not configured for this organization.' }, { status: 400 })
    }
    if (wa.enabled === false) {
      return NextResponse.json({ ok: false, error: 'WhatsApp messaging is disabled in settings.' }, { status: 400 })
    }

    const result = await sendWhatsApp({
      provider: wa.provider, config: wa, to, templateName, params, text, languageCode,
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    console.error('[whatsapp/send] unexpected error:', err.message)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
