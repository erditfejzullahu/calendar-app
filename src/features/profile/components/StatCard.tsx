import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';

type Variant = 'primary' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  value: number;
  variant?: Variant;
};

const tone = (v: Variant) => {
  switch (v) {
    case 'success':
      return {bg: colors.successSoft, fg: colors.success};
    case 'warning':
      return {bg: colors.warningSoft, fg: colors.warning};
    case 'danger':
      return {bg: colors.dangerSoft, fg: colors.danger};
    case 'primary':
    default:
      return {bg: colors.primarySoft, fg: colors.primary};
  }
};

const StatCardBase = memo(({label, value, variant = 'primary'}: Props) => {
  const t = tone(variant);
  return (
    <View style={styles.card}>
      <View style={[styles.badge, {backgroundColor: t.bg}]}>
        <AppText variant="overline" color={t.fg}>
          {label}
        </AppText>
      </View>
      <AppText variant="displayMd" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
});

export const StatCard = memo(StatCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  value: {marginTop: spacing.xs},
});
