import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

/**
 * Default native-stack options used for screen transitions throughout the
 * app. Keeps the feel consistent and lets us swap globally in one place.
 */
export const defaultStackOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: 240,
  gestureEnabled: true,
  contentStyle: {backgroundColor: 'transparent'},
};

export const modalStackOptions: NativeStackNavigationOptions = {
  ...defaultStackOptions,
  animation: 'slide_from_bottom',
  presentation: 'modal',
};

export const fadeStackOptions: NativeStackNavigationOptions = {
  ...defaultStackOptions,
  animation: 'fade',
};
