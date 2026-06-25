import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Registers (or refreshes) the Telegram webhook for an org's bot so that when a
// lead/patient taps the deep link and presses Start, Telegram posts the update
// to /api/telegram/webhook/<orgId>. Stores a secret (verified on each call) and
// caches the bot username (used to build t.me/<bot>?start=… deep links).
//
// Body: { orgId, origin }   origin = public site URL, e.g. https://clinic.app

export async function POST(req) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { orgId, origin } = body || {}
    if (!orgId)  return NextResponse.json({ ok: false, error: 'Missing orgId' }, { status: 400 })
    if (!origin) return NextResponse.json({ ok: false, error: 'Missing origin (public site URL)' }, { status: 400 })
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return NextResponse.json({ ok: false, error: 'Telegram cannot reach localhost — deploy first, then enable from the live site.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: org } = await supabase.from('organizations').select('settings').eq('id', orgId).maybeSingle()
    const tg = org?.settings?.telegram
    if (!tg?.bot_token) return NextResponse.json({ ok: false, error: 'Save a Telegram bot token first.' }, { status: 400 })

    // Confirm the token + grab the bot username for deep links.
    const meRes = await fetch(`https://api.telegram.org/bot${tg.bot_token}/getMe`)
    const me = await meRes.json().catch(() => null)
    if (!me?.ok || !me.result?.username) {
      return NextResponse.json({ ok: false, error: me?.description || 'Invalid bot token' }, { status: 400 })
    }
    const botUsername = me.result.username

    const secret = tg.webhook_secret || crypto.randomUUID().replace(/-/g, '')
    const url = `${origin.replace(/\/$/, '')}/api/telegram/webhook/${orgId}`

    const setRes = await fetch(`https://api.telegram.org/bot${tg.bot_token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secret,
        allowed_updates: ['message'],
        drop_pending_updates: false,
      }),
    })
    const set = await setRes.json().catch(() => null)
    if (!set?.ok) {
      return NextResponse.json({ ok: false, error: set?.description || 'Telegram rejected the webhook URL' }, { status: 502 })
    }

    const telegram = { ...tg, webhook_secret: secret, webhook_enabled: true, webhook_url: url, bot_username: botUsername }
    await supabase.from('organizations').update({ settings: { ...(org.settings || {}), telegram } }).eq('id', orgId)

    return NextResponse.json({ ok: true, bot_username: botUsername, webhook_url: url, telegram })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
