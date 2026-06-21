// Telegram Bot API adapter. SERVER-ONLY.
// Returns uniform { ok, status, response, error } matching the WhatsApp adapter shape.
// Docs: https://core.telegram.org/bots/api

async function doFetch(url, opts) {
  try {
    const res = await fetch(url, opts)
    const txt = await res.text()
    let body
    try { body = JSON.parse(txt) } catch { body = txt }
    return { ok: res.ok, status: res.status, response: body }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

// ── Send text message ─────────────────────────────────────────
async function sendMessage({ token, chatId, text, parseMode = 'HTML', disablePreview = true }) {
  return doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      link_preview_options: { is_disabled: disablePreview },
    }),
  })
}

// ── Send photo with optional caption ─────────────────────────
async function sendPhoto({ token, chatId, photoUrl, caption, parseMode = 'HTML' }) {
  return doFetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption || '',
      parse_mode: parseMode,
    }),
  })
}

// ── Send document (PDF, file URL) ─────────────────────────────
async function sendDocument({ token, chatId, documentUrl, caption, parseMode = 'HTML' }) {
  return doFetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      document: documentUrl,
      caption: caption || '',
      parse_mode: parseMode,
    }),
  })
}

// ── Main export ────────────────────────────────────────────────
// config = org.settings.telegram
// Dispatch based on what's provided. photoUrl → sendPhoto, documentUrl → sendDocument, else sendMessage.
export async function sendTelegram({ config = {}, chatId, text, parseMode, photoUrl, documentUrl, caption }) {
  if (!config.bot_token) return { ok: false, error: 'Telegram bot token is not configured.' }

  const targetChat = chatId || config.default_chat_id
  if (!targetChat) return { ok: false, error: 'Chat ID is required. Pass chatId or set a default_chat_id in settings.' }

  const token = config.bot_token

  if (photoUrl) {
    return sendPhoto({ token, chatId: targetChat, photoUrl, caption: caption || text, parseMode })
  }
  if (documentUrl) {
    return sendDocument({ token, chatId: targetChat, documentUrl, caption: caption || text, parseMode })
  }
  if (!text) return { ok: false, error: 'Message text is required.' }
  return sendMessage({ token, chatId: targetChat, text, parseMode })
}

// ── Utility — called by the verify route ──────────────────────
export async function getTelegramBotInfo(token) {
  const [me, updates] = await Promise.all([
    doFetch(`https://api.telegram.org/bot${token}/getMe`),
    doFetch(`https://api.telegram.org/bot${token}/getUpdates`),
  ])

  const bot = me.response?.result || null
  const botOk = !!bot?.id

  const chats = []
  const seen = new Set()
  for (const update of (updates.response?.result || [])) {
    const msg = update.message || update.channel_post || update.edited_message || update.my_chat_member?.chat
    const chat = msg?.chat || (update.my_chat_member?.chat)
    if (!chat) continue
    if (!seen.has(chat.id)) {
      seen.add(chat.id)
      chats.push({ id: chat.id, type: chat.type, title: chat.title, first_name: chat.first_name })
    }
  }

  return { botOk, bot, chats, error: botOk ? null : (me.response?.description || 'Invalid bot token') }
}
