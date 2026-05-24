import {TextStyle} from 'react-native';

type Variant =
  | 'displayLg'
  | 'displayMd'
  | 'titleLg'
  | 'titleMd'
  | 'titleSm'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'overline';

export const typography: Record<Variant, TextStyle> = {
  displayLg: {fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4},
  displayMd: {fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3},
  titleLg: {fontSize: 22, lineHeight: 28, fontWeight: '700'},
  titleMd: {fontSize: 18, lineHeight: 24, fontWeight: '600'},
  titleSm: {fontSize: 15, lineHeight: 20, fontWeight: '600'},
  body: {fontSize: 15, lineHeight: 22, fontWeight: '400'},
  bodyStrong: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
  caption: {fontSize: 13, lineHeight: 18, fontWeight: '500'},
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};

export type TypographyVariant = Variant;
