import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Count positional params {{1}}…{{N}} in a string.
function countParams(text = '') {
  const indices = new Set()
  for (const m of String(text).matchAll(/\{\{(\d+)\}\}/g)) indices.add(Number(m[1]))
  return indices.size
}

// Normalize one raw template object → { name, language, status, paramCount, bodyText }
function normalizeTemplate(t) {
  let bodyText = ''
  // Standard WABA components array
  if (Array.isArray(t.components)) {
    const body = t.components.find(c => (c.type || '').toUpperCase() === 'BODY')
    bodyText = body?.text || ''
  }
  // Flat body / message field fallback
  if (!bodyText) bodyText = t.body || t.message || t.body_text || ''
  const paramCount = countParams(bodyText)
  return {
    name: t.name || t.template_name || '',
    language: t.language || t.language_code || 'en',
    status: (t.status || 'unknown').toLowerCase(),
    paramCount,
    bodyText,
  }
}

export async function GET(req) {
  const orgId = new URL(req.url).searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: org, error } = await supabase
    .from('organizations').select('settings').eq('id', orgId).maybeSingle()
  if (error || !org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const wa = org.settings?.whatsapp
  if (!wa?.provider) return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })

  if (wa.provider !== 'nebkern') {
    return NextResponse.json(
      { error: `Template listing is only supported for Nebkern (current: ${wa.provider})` },
      { status: 400 },
    )
  }
  if (!wa.api_key) return NextResponse.json({ error: 'Nebkern API key missing' }, { status: 400 })

  try {
    const res = await fetch('https://waba.nebkern.com/api/integrations/templates', {
      headers: { 'x-api-key': wa.api_key },
    })
    const raw = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ error: raw?.message || `Nebkern returned ${res.status}` }, { status: res.status })
    }
    // Normalize to a flat array regardless of what shape Nebkern returns.
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.templates) ? raw.templates
      : Array.isArray(raw?.data)      ? raw.data
      : []
    const templates = list.map(normalizeTemplate).filter(t => t.name)
    return NextResponse.json({ templates })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
