import {ReactNode, forwardRef, useState} from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {AppText} from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
  containerStyle?: ViewStyle;
};

export const TextField = forwardRef<TextInput, Props>(
  ({label, error, hint, rightSlot, containerStyle, onFocus, onBlur, ...inputProps}, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <AppText variant="caption" color={colors.textMuted} style={styles.label}>
            {label}
          </AppText>
        ) : null}

        <Pressable
          style={[
            styles.inputWrap,
            focused && styles.inputWrapFocused,
            !!error && styles.inputWrapError,
          ]}
          onPress={() => {
            if (ref && typeof ref !== 'function' && ref.current) {
              ref.current.focus();
            }
          }}>
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            {...inputProps}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={styles.input}
          />
          {rightSlot}
        </Pressable>

        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.helper}>
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="caption" color={colors.textMuted} style={styles.helper}>
            {hint}
          </AppText>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {width: '100%'},
  label: {marginBottom: spacing.xs, marginLeft: spacing.xxs},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputWrapFocused: {borderColor: colors.primary},
  inputWrapError: {borderColor: colors.danger},
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  helper: {marginTop: spacing.xs, marginLeft: spacing.xxs},
});
