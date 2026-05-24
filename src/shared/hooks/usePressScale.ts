import {useCallback} from 'react';
import {useSharedValue, useAnimatedStyle, withTiming, Easing} from 'react-native-reanimated';

/**
 * Tiny tactile press animation reused across pressables.
 * Returns the animated style + two handlers to wire into onPressIn/onPressOut.
 */
export const usePressScale = (scaleTo: number = 0.96) => {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, {duration: 90, easing: Easing.out(Easing.quad)});
  }, [scale, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, {duration: 140, easing: Easing.out(Easing.quad)});
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  return {animatedStyle, onPressIn, onPressOut};
};
