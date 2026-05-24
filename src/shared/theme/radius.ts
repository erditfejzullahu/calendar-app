export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
