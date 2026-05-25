/**
 * Runs after `@react-native/jest-preset/setup.js`.
 *
 * IMPORTANT: Avoid importing `react-native-reanimated/mock` — Reanimated's mock bundles
 * worklets natives that aren't available in jsdom/Jest unless you install native shims.
 * This lightweight stub satisfies `useSharedValue/useAnimatedStyle` call sites used by buttons.
 *
 * Extend `transformIgnorePatterns` in `jest.config.js` whenever a dependency ships ESM-only
 * `node_modules` code (@react-native-firebase is scoped there).
 */

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => {
  const useSharedValue = (init: number) => ({ value: init });
  const withTiming = jest.fn((toValue: unknown) => toValue);
  const Easing = {
    quad: jest.fn(fn => fn),
    out: jest.fn(pattern => pattern),
  };

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component: unknown) => component,
    },
    createAnimatedComponent: (component: unknown) => component,
    useSharedValue,
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming,
    Easing,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
