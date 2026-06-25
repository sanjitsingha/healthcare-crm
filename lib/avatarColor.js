// Deterministic avatar background colour derived from a name/string — same input
// always yields the same colour (Google/Slack-style). All tones are dark enough
// to pair with white text.
const AVATAR_PALETTE = [
  '#1a73e8', // blue
  '#d93025', // red
  '#188038', // green
  '#e37400', // orange
  '#9334e6', // purple
  '#0b8043', // emerald
  '#d01884', // pink
  '#00897b', // teal
  '#3949ab', // indigo
  '#c5221f', // crimson
  '#6d4c41', // brown
  '#546e7a', // slate
]

export function avatarColor(str = '') {
  const s = String(str || '?')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}
