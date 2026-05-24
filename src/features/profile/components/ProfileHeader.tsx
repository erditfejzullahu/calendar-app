import {StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import type {AuthUser} from '@app-types/user';
import {memo} from 'react';

type Props = {user: AuthUser; roleLabel: string};

const initialOf = (s: string | null | undefined): string =>
  (s ?? '?').trim().charAt(0).toUpperCase() || '?';

export const ProfileHeader = memo(({user, roleLabel}: Props) => {
  const initial = initialOf(user.displayName || user.email);

  return (
    <View style={styles.root}>
      <View style={styles.avatar}>
        <AppText variant="titleLg" color={colors.textInverse}>
          {initial}
        </AppText>
      </View>
      <View style={styles.col}>
        <AppText variant="titleLg">{user.displayName ?? 'Welcome'}</AppText>
        {user.email ? (
          <AppText variant="caption" color={colors.textMuted}>
            {user.email}
          </AppText>
        ) : null}
        <AppText variant="caption" color={colors.textMuted}>
          Role · {roleLabel}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  col: {flex: 1},
});
