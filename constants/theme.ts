export const colors = {
  bg: '#0B0B0F',
  surface: '#16161D',
  surfaceAlt: '#1F1F29',
  border: '#2A2A36',
  text: '#F5F5F7',
  textMuted: '#9A9AA8',
  primary: '#6C5CE7',
  primaryDark: '#5546d6',
  danger: '#FF5C5C',
  success: '#2ECC71',
  overlayScrim: 'rgba(0,0,0,0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

// Teleprompter text color presets the user can cycle through.
export const textColorPresets = [
  '#FFFFFF',
  '#FFE66D',
  '#7CF5A0',
  '#6CC6FF',
  '#FF9F6C',
] as const;

export const fontFamilies = [
  { label: 'System', value: 'System' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
] as const;

export type FontFamilyValue = (typeof fontFamilies)[number]['value'];
