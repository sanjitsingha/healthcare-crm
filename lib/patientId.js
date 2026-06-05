import { format as fmtDate } from 'date-fns'

// Date token → date-fns pattern
export const DATE_FORMATS = {
  YYYYMMDD:  { label: 'YYYYMMDD', pattern: 'yyyyMMdd' },
  YYMMDD:    { label: 'YYMMDD',   pattern: 'yyMMdd' },
  YYYYMM:    { label: 'YYYYMM',   pattern: 'yyyyMM' },
  YYYY:      { label: 'YYYY',     pattern: 'yyyy' },
  YY:        { label: 'YY',       pattern: 'yy' },
  DDMMYY:    { label: 'DDMMYY',   pattern: 'ddMMyy' },
}

export const SEPARATORS = [
  { value: '-', label: 'Dash ( - )' },
  { value: '/', label: 'Slash ( / )' },
  { value: '.', label: 'Dot ( . )' },
  { value: '_', label: 'Underscore ( _ )' },
  { value: ' ', label: 'Space' },
]

export const DEFAULT_ID_FORMAT = {
  enabled: false,
  next_seq: 1,
  tokens: [
    { id: 't1', type: 'text', value: 'PT' },
    { id: 't2', type: 'separator', value: '-' },
    { id: 't3', type: 'date', value: 'YYYYMMDD' },
    { id: 't4', type: 'separator', value: '-' },
    { id: 't5', type: 'seq', value: 4 },
  ],
}

// Convert legacy (prefix/date_format/separator/seq_digits) config to tokens
export function toTokens(cfg = {}) {
  if (Array.isArray(cfg.tokens) && cfg.tokens.length) return cfg.tokens
  const sep = cfg.separator && cfg.separator !== 'none' ? cfg.separator : '-'
  const tokens = []
  const uid = () => Math.random().toString(36).slice(2)
  if (cfg.prefix) tokens.push({ id: uid(), type: 'text', value: cfg.prefix })
  if (cfg.date_format && cfg.date_format !== 'none' && DATE_FORMATS[cfg.date_format]) {
    if (tokens.length) tokens.push({ id: uid(), type: 'separator', value: sep })
    tokens.push({ id: uid(), type: 'date', value: cfg.date_format })
  }
  if (tokens.length) tokens.push({ id: uid(), type: 'separator', value: sep })
  tokens.push({ id: uid(), type: 'seq', value: cfg.seq_digits || 4 })
  return tokens
}

// Build a patient code from the token list + a sequence number.
export function buildPatientCode(cfg = {}, seq = 1, date = new Date()) {
  const tokens = toTokens(cfg)
  return tokens.map(tok => {
    if (tok.type === 'text')      return tok.value || ''
    if (tok.type === 'separator') return tok.value || ''
    if (tok.type === 'date')      { const p = DATE_FORMATS[tok.value]?.pattern; return p ? fmtDate(date, p) : '' }
    if (tok.type === 'seq')       return String(seq).padStart(Number(tok.value) || 4, '0')
    return ''
  }).join('')
}
