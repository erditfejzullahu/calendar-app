import {memo} from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleProp, TextStyle} from 'react-native';
import {colors} from '@shared/theme/colors';
import {typography, TypographyVariant} from '@shared/theme/typography';

export type AppTextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

const AppTextBase = ({
  variant = 'body',
  color = colors.text,
  align,
  style,
  children,
  ...rest
}: AppTextProps) => {
  const composed: StyleProp<TextStyle> = [
    typography[variant],
    {color},
    align ? {textAlign: align} : null,
    style,
  ];
  return (
    <RNText {...rest} style={composed}>
      {children}
    </RNText>
  );
};

export const AppText = memo(AppTextBase);
