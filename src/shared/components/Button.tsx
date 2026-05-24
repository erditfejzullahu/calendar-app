import {memo, useMemo} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {AppText} from './Text';
import {usePressScale} from '@shared/hooks/usePressScale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ButtonBase = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: Props) => {
  const {animatedStyle, onPressIn, onPressOut} = usePressScale(0.97);

  const palette = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return {bg: colors.surface, fg: colors.text, border: colors.border};
      case 'ghost':
        return {bg: 'transparent', fg: colors.primary, border: 'transparent'};
      case 'danger':
        return {bg: colors.danger, fg: colors.textInverse, border: colors.danger};
      case 'primary':
      default:
        return {bg: colors.primary, fg: colors.textInverse, border: colors.primary};
    }
  }, [variant]);

  const dims = useMemo(() => {
    switch (size) {
      case 'sm':
        return {paddingV: spacing.sm, paddingH: spacing.md, minH: 36};
      case 'lg':
        return {paddingV: spacing.lg, paddingH: spacing.xl, minH: 56};
      case 'md':
      default:
        return {paddingV: spacing.md, paddingH: spacing.lg, minH: 48};
    }
  }, [size]);

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: dims.paddingV,
          paddingHorizontal: dims.paddingH,
          minHeight: dims.minH,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        animatedStyle,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          <AppText variant="titleSm" color={palette.fg}>
            {label}
          </AppText>
        </View>
      )}
    </AnimatedPressable>
  );
};

export const Button = memo(ButtonBase);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
});
