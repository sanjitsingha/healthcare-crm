import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/messaging/telegram'

// Telegram webhook receiver (one per org — URL carries the orgId).
// Registered by /api/telegram/set-webhook. When a lead/patient opens the deep
// link  t.me/<bot>?start=<target>-<id>  and taps Start, Telegram POSTs a
// `/start <target>-<id>` message here. We resolve the contact and store their
// chat id on custom_data.telegram_chat_id, then confirm back in-chat.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const TABLE = { lead: 'leads', patient: 'patients' }

// "lead-<uuid>" → { target:'lead', id:'<uuid>' }   (split on the FIRST hyphen)
function parseStartParam(param) {
  if (!param) return null
  const i = param.indexOf('-')
  if (i < 0) return null
  const target = param.slice(0, i)
  const id = param.slice(i + 1)
  if (!TABLE[target] || !id) return null
  return { target, id }
}

export async function POST(req, { params }) {
  try {
    const { orgId } = await params
    if (!orgId) return json({ ok: false }, 400)

    const supabase = createAdminClient()
    const { data: org } = await supabase.from('organizations').select('settings').eq('id', orgId).maybeSingle()
    const tg = org?.settings?.telegram
    if (!tg?.bot_token) return json({ ok: true })  // nothing to do; ack so Telegram stops retrying

    // Verify the secret Telegram echoes back (set during setWebhook).
    const secret = req.headers.get('x-telegram-bot-api-secret-token')
    if (tg.webhook_secret && secret !== tg.webhook_secret) return json({ ok: false }, 401)

    const update = await req.json().catch(() => null)
    const msg = update?.message
    const text = msg?.text || ''
    const chat = msg?.chat
    if (!chat?.id || !text.startsWith('/start')) return json({ ok: true })

    const param = text.slice('/start'.length).trim()
    const parsed = parseStartParam(param)
    if (!parsed) {
      // A bare /start with no contact token — greet, but nothing to link.
      await sendTelegram({ config: tg, chatId: chat.id, text: '👋 Hi! Open the link from your clinic to connect this chat.' })
      return json({ ok: true })
    }

    const table = TABLE[parsed.target]
    const { data: row } = await supabase.from(table)
      .select('id, custom_data, organization_id').eq('id', parsed.id).eq('organization_id', orgId).maybeSingle()
    if (!row) return json({ ok: true })

    const display = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || chat.title || null
    const custom_data = {
      ...(row.custom_data || {}),
      telegram_chat_id: String(chat.id),
      telegram_username: msg.from?.username || null,
      telegram_name: display,
    }
    await supabase.from(table)
      .update({ custom_data, updated_at: new Date().toISOString() }).eq('id', row.id)

    await sendTelegram({ config: tg, chatId: chat.id, text: '✅ You are connected. You will receive updates from your clinic here.' })
    return json({ ok: true })
  } catch (err) {
    console.error('[telegram/webhook] error:', err.message)
    return json({ ok: true })  // always ack — never make Telegram retry-storm
  }
}

// Reachability check.
export async function GET() {
  return json({ ok: true, service: 'telegram-webhook' })
}
