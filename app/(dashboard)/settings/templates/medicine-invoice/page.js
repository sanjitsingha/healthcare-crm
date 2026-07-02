'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, Loader2, CheckCircle2, Upload, FileText, Trash2, RefreshCw,
} from 'lucide-react'
import { useOrg } from '@/lib/context/OrgContext'
import { updateOrganization } from '@/lib/supabase/queries'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import InvoiceDocument, {
  InvoiceSheet, INVOICE_LAYOUTS, DUMMY_SALE, DEFAULT_MARGINS, defaultInvoiceTemplate,
} from '@/components/pharmacy/InvoiceDocument'

// A4 footprint in px at 96dpi — used to scale the live preview down to fit.
const A4_W = 794
const A4_H = 1123

// Rasterize page 1 of a PDF to a PNG blob at ~150 DPI (A4).
async function pdfToPng(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: 1240 / base.width }) // ~150 DPI on A4 width
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return await new Promise(res => canvas.toBlob(res, 'image/png', 0.92))
}

export default function MedicineInvoiceDesigner() {
  const { org, orgId } = useOrg()
  const router = useRouter()

  const existing = org?.settings?.invoice_templates?.medicine_invoice
  const [tmpl, setTmpl] = useState(() => existing || defaultInvoiceTemplate())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const wasActive = !!existing?.active

  const [accent, setAccent] = useState('#2563eb')
  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()
    if (c) setAccent(c)
  }, [])

  // Scale the A4 sheet to fit the preview column width.
  const previewRef = useRef(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, (e.contentRect.width - 8) / A4_W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const setMargin = (key, val) => {
    const n = Math.max(0, Math.min(140, Math.round(Number(val) || 0)))
    setTmpl(t => ({ ...t, margins: { ...(t.margins || DEFAULT_MARGINS), [key]: n } }))
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting same file
    if (!file) return
    if (file.type !== 'application/pdf') { toast({ type: 'error', title: 'PDF only', message: 'Upload a PDF letterhead.' }); return }
    if (file.size > 15 * 1024 * 1024) { toast({ type: 'error', title: 'File too large', message: 'Keep the PDF under 15 MB.' }); return }
    setUploading(true)
    try {
      const png = await pdfToPng(file)
      if (!png) throw new Error('Could not render the PDF.')
      const path = `${orgId}/medicine-invoice-${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from('invoice-templates').upload(path, png, { contentType: 'image/png', upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('invoice-templates').getPublicUrl(path)
      setTmpl(t => ({ ...t, letterheadUrl: data.publicUrl }))
      toast({ type: 'success', title: 'Letterhead added', message: 'Header & footer set from your PDF.' })
    } catch (err) {
      toast({ type: 'error', title: 'Upload failed', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  const removeLetterhead = () => setTmpl(t => ({ ...t, letterheadUrl: '' }))

  const save = async () => {
    setSaving(true)
    try {
      const next = {
        ...(org?.settings || {}),
        invoice_templates: {
          ...(org?.settings?.invoice_templates || {}),
          medicine_invoice: { ...tmpl, active: true },
        },
      }
      await updateOrganization(orgId, { settings: next })
      toast({ type: 'success', title: 'Template activated', message: 'New invoices will use this design.' })
      router.refresh()
    } catch (err) {
      toast({ type: 'error', title: 'Could not save', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const previewSale = useMemo(() => DUMMY_SALE, [])

  return (
    <div className="max-w-6xl">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/settings/templates"
            className="p-2 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-700" style={{ color: 'var(--color-text-primary)' }}>Medicine Invoice</h1>
              {wasActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                  <CheckCircle2 size={10} /> Active
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Upload your letterhead, pick a data layout, set the placement.</p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving || uploading} className="btn btn-primary btn-md disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Saving…' : 'Confirm & Activate'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ── Controls ── */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-4">
          {/* Letterhead upload */}
          <Section title="Letterhead (PDF)" subtitle="Your header & footer design. We place the invoice data between them.">
            <input ref={fileRef} type="file" accept="application/pdf" onChange={onPickFile} className="hidden" />
            {tmpl.letterheadUrl ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-(--color-border) overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tmpl.letterheadUrl} alt="Letterhead" className="w-full block" style={{ aspectRatio: '210/297', objectFit: 'contain' }} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-(--color-border) text-xs font-600 hover:bg-(--color-surface-2) transition-colors disabled:opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Replace
                  </button>
                  <button type="button" onClick={removeLetterhead} disabled={uploading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-(--color-border) text-xs font-600 hover:bg-red-50 transition-colors disabled:opacity-50" style={{ color: '#b91c1c' }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-colors hover:border-(--color-brand) disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                {uploading
                  ? <><Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-brand)' }} /><span className="text-xs font-600" style={{ color: 'var(--color-text-muted)' }}>Rendering PDF…</span></>
                  : <><Upload size={22} style={{ color: 'var(--color-brand)' }} /><span className="text-sm font-600" style={{ color: 'var(--color-text-primary)' }}>Upload PDF letterhead</span><span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>A4 · first page used · max 15 MB</span></>}
              </button>
            )}
            {!tmpl.letterheadUrl && (
              <p className="flex items-center gap-1.5 text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                <FileText size={12} /> Optional — without it, invoices print on a plain sheet.
              </p>
            )}
          </Section>

          {/* Data layout */}
          <Section title="Data layout" subtitle="How the invoice content is arranged.">
            <div className="grid grid-cols-1 gap-2">
              {INVOICE_LAYOUTS.map(l => {
                const selected = tmpl.layout === l.id
                return (
                  <button key={l.id} type="button" onClick={() => setTmpl(t => ({ ...t, layout: l.id }))}
                    className="flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
                    style={selected
                      ? { borderColor: 'var(--color-brand)', background: 'var(--color-brand-50)' }
                      : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    <LayoutThumb id={l.id} accent={accent} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-700" style={{ color: 'var(--color-text-primary)' }}>{l.name}</p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{l.desc}</p>
                    </div>
                    <span className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                      style={selected ? { background: 'var(--color-brand)', borderColor: 'var(--color-brand)' } : { borderColor: 'var(--color-border)' }}>
                      {selected && <Check size={10} color="#fff" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Placement */}
          <Section title="Placement" subtitle="Margins (mm) — keep the data clear of your header & footer art.">
            <div className="grid grid-cols-3 gap-2">
              <NumField label="Top" value={tmpl.margins?.top} onChange={v => setMargin('top', v)} />
              <NumField label="Bottom" value={tmpl.margins?.bottom} onChange={v => setMargin('bottom', v)} />
              <NumField label="Sides" value={tmpl.margins?.side} onChange={v => setMargin('side', v)} />
            </div>
            <button type="button" onClick={() => setTmpl(t => ({ ...t, margins: { ...DEFAULT_MARGINS } }))}
              className="text-[11px] font-600 mt-1 hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
              Reset to defaults
            </button>
          </Section>
        </div>

        {/* ── Live A4 preview ── */}
        <div className="flex-1 min-w-0 w-full lg:sticky lg:top-0">
          <div className="rounded-2xl border border-(--color-border) p-4" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-700 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>A4 Preview</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Dummy data · 210 × 297 mm</p>
            </div>
            <div ref={previewRef} className="flex justify-center overflow-hidden">
              <div style={{ width: A4_W * scale, height: A4_H * scale }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', width: A4_W, height: A4_H }}>
                  <InvoiceSheet template={tmpl}>
                    <InvoiceDocument sale={previewSale} template={tmpl} accent={accent} />
                  </InvoiceSheet>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mini layout schematic for the data-layout cards ────────────
function LayoutThumb({ id, accent }) {
  const line = (w, c = '#d1d5db') => <div style={{ height: 3, width: w, borderRadius: 2, background: c }} />
  return (
    <div className="w-11 h-14 rounded-md border shrink-0 p-1 flex flex-col gap-1 justify-start overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: '#fff' }}>
      {id === 'modern'
        ? <div style={{ height: 7, margin: '0 0 2px', background: accent, borderRadius: 2 }} />
        : <div className="flex justify-between">{line('40%', '#9ca3af')}{line('25%', '#9ca3af')}</div>}
      {[...Array(id === 'compact' ? 4 : 3)].map((_, i) => (
        <div key={i} className="flex gap-0.5 items-center">{line('50%')}{line('20%')}</div>
      ))}
      <div className="mt-auto flex justify-end">{line('40%', id === 'modern' ? accent : '#9ca3af')}</div>
    </div>
  )
}

// ── Small UI helpers ───────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-(--color-border) p-4" style={{ background: 'var(--color-surface)' }}>
      <p className="text-sm font-700" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      {subtitle && <p className="text-[11px] mb-3 mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-700 uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      <div className="flex items-center rounded-lg border border-(--color-border)" style={{ background: 'var(--color-surface-2)' }}>
        <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)}
          className="w-full px-2.5 py-2 bg-transparent text-sm outline-none" style={{ color: 'var(--color-text-primary)' }} />
        <span className="px-2 text-[11px] font-600" style={{ color: 'var(--color-text-muted)' }}>mm</span>
      </div>
    </div>
  )
}
