import {useEffect} from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Mount-time fade + slide-up. Useful for screen content & sheets.
 */
export const useFadeIn = (delay: number = 0, translateY: number = 8) => {
  const opacity = useSharedValue(0);
  const y = useSharedValue(translateY);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, {duration: 320, easing: Easing.out(Easing.cubic)}),
    );
    y.value = withDelay(
      delay,
      withTiming(0, {duration: 360, easing: Easing.out(Easing.cubic)}),
    );
  }, [opacity, y, delay]);

  return useAnimatedStyle(() => ({opacity: opacity.value, transform: [{translateY: y.value}]}));
};
