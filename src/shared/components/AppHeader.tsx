import {memo} from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {AppText} from './Text';

type Props = {
  title: string;
  subtitle?: string;
  leftAction?: {label: string; onPress: () => void};
  rightAction?: {label: string; onPress: () => void};
  style?: ViewStyle;
};

const AppHeaderBase = ({title, subtitle, leftAction, rightAction, style}: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, {paddingTop: insets.top + spacing.sm}, style]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {leftAction ? (
            <Pressable hitSlop={12} onPress={leftAction.onPress}>
              <AppText variant="bodyStrong" color={colors.primary}>
                {leftAction.label}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.center}>
          <AppText variant="titleMd" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideRight]}>
          {rightAction ? (
            <Pressable hitSlop={12} onPress={rightAction.onPress}>
              <AppText variant="bodyStrong" color={colors.primary}>
                {rightAction.label}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export const AppHeader = memo(AppHeaderBase);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  side: {minWidth: 72},
  sideRight: {alignItems: 'flex-end'},
  center: {flex: 1, alignItems: 'center'},
});
