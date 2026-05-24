export const palette = {
  black: '#0B0F19',
  white: '#FFFFFF',
  gray50: '#F7F8FA',
  gray100: '#EEF0F4',
  gray200: '#DDE1E8',
  gray300: '#C2C8D2',
  gray400: '#9BA3B0',
  gray500: '#6E7686',
  gray600: '#4B5260',
  gray700: '#2F3540',
  gray800: '#1B1F28',

  brand500: '#6366F1',
  brand600: '#4F46E5',
  brand700: '#4338CA',
  brandSoft: '#EEF0FF',

  success: '#10B981',
  successSoft: '#D1FAE5',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
} as const;

export const colors = {
  bg: palette.gray50,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  border: palette.gray200,
  borderStrong: palette.gray300,
  text: palette.black,
  textMuted: palette.gray500,
  textInverse: palette.white,

  primary: palette.brand600,
  primaryActive: palette.brand700,
  primarySoft: palette.brandSoft,

  success: palette.success,
  successSoft: palette.successSoft,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  warning: palette.warning,
  warningSoft: palette.warningSoft,

  overlay: 'rgba(11, 15, 25, 0.45)',
} as const;

export type AppColors = typeof colors;
