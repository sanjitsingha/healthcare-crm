// Brand logo marks for integration providers, sourced from react-icons
// (Simple Icons). They accept a `size` prop like lucide icons and render in
// each brand's official color.
import { SiGoogleforms, SiMeta, SiZapier } from 'react-icons/si'

export function GoogleFormsLogo({ size = 18 }) {
  return <SiGoogleforms size={size} color="#7248B9" />
}

export function MetaLogo({ size = 18 }) {
  return <SiMeta size={size} color="#0467DF" />
}

export function ZapierLogo({ size = 18 }) {
  return <SiZapier size={size} color="#FF4F00" />
}
