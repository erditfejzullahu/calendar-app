import {ReactNode} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {Screen} from '@shared/components/Screen';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {useFadeIn} from '@shared/hooks/useFadeIn';
import { memo } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const AuthLayout = memo(({title, subtitle, children}: Props) => {
  const animatedStyle = useFadeIn();

  return (
    <Screen edges={['top']} background={colors.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kb}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.brand, animatedStyle]}>
            <View style={styles.logoDot} />
            <AppText variant="overline" color={colors.primary}>
              CalendarApp
            </AppText>
          </Animated.View>

          <Animated.View style={animatedStyle}>
            <AppText variant="displayMd">{title}</AppText>
            {subtitle ? (
              <AppText variant="body" color={colors.textMuted} style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </Animated.View>

          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
});

const styles = StyleSheet.create({
  kb: {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl},
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  subtitle: {marginTop: spacing.xs},
  body: {marginTop: spacing['2xl'], gap: spacing.lg},
});
