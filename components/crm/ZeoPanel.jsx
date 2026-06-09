'use client'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Bot, User, Plus } from 'lucide-react'

// Zeo — AI assistant panel (UI only for now). Slides in from the right.
// Wiring to a real RAG backend comes later; for now replies are stubbed.

const SUGGESTIONS = [
  'How many leads converted this month?',
  'Show overdue follow-ups',
  'Summarize patient PT1',
  'Which source brings the most leads?',
]

function Bubble({ role, children }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={isUser
          ? { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }
          : { background: 'var(--color-brand)', color: 'white' }}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>
      <div className="max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed"
        style={isUser
          ? { background: 'var(--color-brand)', color: 'white', borderTopRightRadius: 4 }
          : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', borderTopLeftRadius: 4 }}>
        {children}
      </div>
    </div>
  )
}

export default function ZeoPanel({ open, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const send = (text) => {
    const q = (text ?? input).trim()
    if (!q || thinking) return
    setMessages(m => [...m, { role: 'user', content: q }])
    setInput('')
    setThinking(true)
    // Stubbed response — real RAG wiring comes later.
    setTimeout(() => {
      setThinking(false)
      setMessages(m => [...m, {
        role: 'assistant',
        content: "I'm Zeo — your CRM assistant. I'm not connected to your data yet, but soon I'll answer questions about your leads, patients, appointments and more.",
      }])
    }, 900)
  }

  const newChat = () => { setMessages([]); setInput(''); setThinking(false) }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ background: 'rgba(13,22,52,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] flex flex-col border-l border-(--color-border) transition-transform duration-300"
        style={{
          background: 'var(--color-surface)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: open ? '-12px 0 40px rgba(13,22,52,0.18)' : 'none',
        }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-(--color-border) shrink-0"
          style={{ background: 'linear-gradient(90deg, var(--color-brand), var(--color-brand-light, #3a43b5))' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Sparkles size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-800 text-white leading-tight">Zeo</p>
            <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>AI assistant · beta</p>
          </div>
          <button type="button" onClick={newChat} title="New chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15" style={{ color: 'white' }}>
            <Plus size={16} />
          </button>
          <button type="button" onClick={onClose} title="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15" style={{ color: 'white' }}>
            <X size={17} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--color-brand-50)' }}>
                <Sparkles size={26} style={{ color: 'var(--color-brand)' }} />
              </div>
              <p className="text-base font-800" style={{ color: 'var(--color-text-primary)' }}>Hi, I'm Zeo</p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Ask me anything about your leads, patients, appointments, and reports.
              </p>
              <div className="w-full mt-5 space-y-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-(--color-border) text-[13px] transition-colors hover:bg-(--color-surface-2)"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <Bubble key={i} role={m.role}>{m.content}</Bubble>)}
              {thinking && (
                <Bubble role="assistant">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '240ms' }} />
                  </span>
                </Bubble>
              )}
            </>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-(--color-border) p-3 shrink-0" style={{ background: 'var(--color-surface)' }}>
          <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask Zeo…"
              className="flex-1 resize-none max-h-32 px-3 py-2.5 text-[13px] rounded-xl border border-(--color-border) outline-none focus:border-(--color-brand)"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
            />
            <button type="submit" disabled={!input.trim() || thinking}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-brand)' }}>
              <Send size={15} />
            </button>
          </form>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Zeo can make mistakes. Not connected to live data yet.
          </p>
        </div>
      </aside>
    </>
  )
}
