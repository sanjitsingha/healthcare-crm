import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/messaging/telegram'

// Outbound Telegram entry point. Reads the org's bot token server-side so
// credentials never leave the backend. Reused by rules / reminders / buttons.
//
// Body: { orgId, chatId?, text?, parseMode?, photoUrl?, documentUrl?, caption? }
//   chatId defaults to org.settings.telegram.default_chat_id when not provided.

export async function POST(req) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { orgId, chatId, text, parseMode, photoUrl, documentUrl, caption } = body || {}
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'Missing orgId.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: org, error } = await supabase
      .from('organizations').select('id, settings').eq('id', orgId).maybeSingle()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!org) return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 })

    const tg = org.settings?.telegram
    if (!tg?.bot_token) {
      return NextResponse.json({ ok: false, error: 'Telegram is not configured for this organization.' }, { status: 400 })
    }
    if (tg.enabled === false) {
      return NextResponse.json({ ok: false, error: 'Telegram messaging is disabled in settings.' }, { status: 400 })
    }

    const result = await sendTelegram({ config: tg, chatId, text, parseMode, photoUrl, documentUrl, caption })
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    console.error('[telegram/send] unexpected error:', err.message)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
