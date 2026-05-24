import {useEffect} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {AppText} from './Text';
import { memo } from 'react';

/**
 * Fully custom bottom tab bar with an animated indicator.
 */
export const BottomTabBar = memo(({state, descriptors, navigation}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const tabCount = state.routes.length;

  useEffect(() => {
    indicatorX.value = withTiming(state.index, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [indicatorX, state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    const percent = 100 / tabCount;
    return {
      left: `${indicatorX.value * percent}%`,
      width: `${percent}%`,
    };
  });

  return (
    <View style={[styles.wrap, {paddingBottom: Math.max(insets.bottom, spacing.sm)}]}>
      <View style={styles.bar}>
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none">
          <View style={styles.indicatorInner} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? {selected: true} : {}}
              onPress={onPress}
              style={styles.tab}>
              <AppText
                variant="titleSm"
                color={isFocused ? colors.primary : colors.textMuted}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bar: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    padding: 4,
  },
  indicatorInner: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
