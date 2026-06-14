import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { subDays, subHours, format } from 'date-fns'

export const revalidate = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const SERVICES = ['database', 'api', 'application']
const WORST = { outage: 3, degraded: 2, operational: 1 }

const TREND_RANGES = {
  '12h': { hours: 12,  bucketFmt: 'HH:mm',     bucket: 'hour' },
  '24h': { hours: 24,  bucketFmt: 'HH:mm',     bucket: 'hour' },
  '7d':  { hours: 168, bucketFmt: 'EEE d MMM', bucket: 'day'  },
  '30d': { hours: 720, bucketFmt: 'd MMM',     bucket: 'day'  },
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const trendRange = searchParams.get('range') || '24h'
  const cfg = TREND_RANGES[trendRange] || TREND_RANGES['24h']

  const client = sb()
  const since90    = subDays(new Date(), 90).toISOString()
  const since48h   = subHours(new Date(), 48).toISOString()   // for hourly uptime blocks
  const sinceTrend = subHours(new Date(), cfg.hours).toISOString()

  try {
    const [{ data: rows90 }, { data: rows48h }, { data: rowsTrend }] = await Promise.all([
      client.from('status_checks')
        .select('service, status, checked_at')
        .gte('checked_at', since90)
        .order('checked_at'),
      client.from('status_checks')
        .select('service, status, checked_at')
        .gte('checked_at', since48h)
        .order('checked_at'),
      client.from('status_checks')
        .select('service, latency_ms, checked_at')
        .gte('checked_at', sinceTrend)
        .order('checked_at'),
    ])

    // ── 90-day daily uptime blocks ────────────────────────────
    const history_daily = {}
    for (const svc of SERVICES) {
      const svcRows = (rows90 || []).filter(r => r.service === svc)
      const dayMap = {}
      for (const row of svcRows) {
        const day = format(new Date(row.checked_at), 'yyyy-MM-dd')
        if (!dayMap[day] || (WORST[row.status] || 0) > (WORST[dayMap[day]] || 0))
          dayMap[day] = row.status
      }
      const days = []
      for (let i = 89; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
        days.push({ date: d, status: dayMap[d] || null })
      }
      history_daily[svc] = days
    }

    // ── 48-hour hourly uptime blocks ─────────────────────────
    const history_hourly = {}
    for (const svc of SERVICES) {
      const svcRows = (rows48h || []).filter(r => r.service === svc)
      const hourMap = {}
      for (const row of svcRows) {
        const h = format(new Date(row.checked_at), 'yyyy-MM-dd HH:00')
        if (!hourMap[h] || (WORST[row.status] || 0) > (WORST[hourMap[h]] || 0))
          hourMap[h] = row.status
      }
      const hours = []
      for (let i = 47; i >= 0; i--) {
        const d = subHours(new Date(), i)
        const key = format(d, 'yyyy-MM-dd HH:00')
        hours.push({ date: key, label: format(d, 'HH:mm'), status: hourMap[key] || null })
      }
      history_hourly[svc] = hours
    }

    // ── Latency trend ─────────────────────────────────────────
    const trend = {}
    for (const svc of SERVICES) {
      const svcRows = (rowsTrend || []).filter(r => r.service === svc)
      const bucketMap = {}
      for (const row of svcRows) {
        const d = new Date(row.checked_at)
        const key = cfg.bucket === 'day'
          ? format(d, 'yyyy-MM-dd')
          : format(d, 'yyyy-MM-dd HH:00')
        if (!bucketMap[key]) bucketMap[key] = []
        if (row.latency_ms != null) bucketMap[key].push(row.latency_ms)
      }
      trend[svc] = Object.entries(bucketMap).map(([key, vals]) => ({
        label: format(new Date(key), cfg.bucketFmt),
        avg_ms: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      }))
    }

    return NextResponse.json({ history_daily, history_hourly, trend })
  } catch {
    return NextResponse.json({ history_daily: {}, history_hourly: {}, trend: {} })
  }
}
