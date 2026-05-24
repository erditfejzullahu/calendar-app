import {colors} from './colors';
import {radius} from './radius';
import {spacing} from './spacing';
import {typography} from './typography';

export const theme = {colors, spacing, radius, typography} as const;
export type Theme = typeof theme;

export {colors, spacing, radius, typography};
export type {AppColors} from './colors';
export type {Spacing} from './spacing';
export type {Radius} from './radius';
export type {TypographyVariant} from './typography';
