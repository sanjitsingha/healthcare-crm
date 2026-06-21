import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTelegramBotInfo } from '@/lib/messaging/telegram'

// Verifies the saved Telegram bot token and returns recent chat IDs from
// getUpdates — used by the settings UI "Get Updates" button so the user can
// discover their chat_id without leaving the CRM.
//
// Body: { orgId }

export async function POST(req) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { orgId } = body || {}
    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: org } = await supabase
      .from('organizations').select('settings').eq('id', orgId).maybeSingle()

    const token = org?.settings?.telegram?.bot_token
    if (!token) return NextResponse.json({ error: 'Bot token not saved yet — save settings first.' }, { status: 400 })

    const info = await getTelegramBotInfo(token)
    return NextResponse.json(info)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
