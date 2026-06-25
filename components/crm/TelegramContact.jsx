'use client'
import { useState } from 'react'
import { Send, Copy, Check, RefreshCw, ExternalLink, MessageCircle } from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { toast } from '@/lib/toast'

// Per-contact Telegram panel for a lead/patient page.
//  • Not connected → shows the deep link (t.me/<bot>?start=<target>-<id>) to send
//    the person. When they tap Start, the webhook stores their chat id.
//  • Connected → shows status + a box to send them a message via /api/telegram/send.
//
// Props: target ('lead'|'patient'), entity (record with id + custom_data), onRefresh()
export default function TelegramContact({ target, entity, onRefresh }) {
  const { org, orgId } = useOrg()
  const tg = org?.settings?.telegram || {}
  const ready = !!(tg.enabled && tg.webhook_enabled && tg.bot_username)

  const chatId   = entity?.custom_data?.telegram_chat_id
  const tgName   = entity?.custom_data?.telegram_name
  const tgUser   = entity?.custom_data?.telegram_username
  const deepLink = ready ? `https://t.me/${tg.bot_username}?start=${target}-${entity.id}` : null

  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [refreshing, setRefresh]  = useState(false)

  const card = (children) => (
    <div className="rounded-xl border border-(--color-border)" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--color-border)">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#e0f2fe' }}>
          <MessageCircle size={13} style={{ color: '#0ea5e9' }} />
        </div>
        <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>Telegram</p>
        {chatId && <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-700 px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>Connected</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )

  if (!ready) {
    return card(
      <p className="text-[13px] leading-6" style={{ color: 'var(--color-text-muted)' }}>
        Telegram isn’t set up yet. Enable it in <b>Settings → Configuration → Telegram</b> and turn on auto-connect.
      </p>
    )
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(deepLink); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const refresh = async () => {
    if (!onRefresh) return
    setRefresh(true)
    try { await onRefresh() } finally { setRefresh(false) }
  }
  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, chatId, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) { toast({ type: 'success', title: 'Sent', message: 'Telegram message delivered.' }); setText('') }
      else toast({ type: 'error', title: 'Not sent', message: data.error || 'Telegram could not deliver this message.' })
    } catch (e) { toast({ type: 'error', title: 'Error', message: e.message }) }
    finally { setSending(false) }
  }

  // ── Not connected: show the deep link to share ──
  if (!chatId) {
    return card(
      <div className="space-y-3">
        <p className="text-[13px] leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          Send this {target} the link below. When they open it and tap <b>Start</b>, this chat connects automatically.
        </p>
        <div className="flex items-center gap-2">
          <input readOnly value={deepLink}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-(--color-border) text-[12px] font-mono outline-none"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }} />
          <button type="button" onClick={copy}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-700 border border-(--color-border) hover:bg-(--color-surface-2) transition-colors"
            style={{ color: 'var(--color-brand)' }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a href={deepLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-700 px-3 py-1.5 rounded-lg text-white" style={{ background: '#0ea5e9' }}>
            <ExternalLink size={12} /> Open chat
          </a>
          <button type="button" onClick={refresh} disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-700 px-3 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors disabled:opacity-50"
            style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Check connection
          </button>
        </div>
      </div>
    )
  }

  // ── Connected: send a message ──
  return card(
    <div className="space-y-3">
      <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        Connected to {tgName || 'this contact'}{tgUser ? ` (@${tgUser})` : ''}.
      </p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
        placeholder={`Message this ${target}…`}
        className="w-full px-3 py-2 rounded-lg border border-(--color-border) text-sm outline-none resize-y focus:border-(--color-brand)"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
      <div className="flex justify-end">
        <button type="button" onClick={send} disabled={sending || !text.trim()}
          className="inline-flex items-center gap-1.5 text-sm font-700 px-4 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
          style={{ background: '#0ea5e9' }}>
          <Send size={13} /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
