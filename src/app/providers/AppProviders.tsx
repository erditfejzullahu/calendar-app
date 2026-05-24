import {ReactNode} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {colors} from '@shared/theme/colors';

/**
 * Store providers were removed when we migrated to Zustand — stores live at
 * module scope. This component now only wires the cross-cutting infra
 * providers that React Native + React Navigation actually require.
 */
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export const AppProviders = ({children}: {children: ReactNode}) => (
  <GestureHandlerRootView style={{flex: 1}}>
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>{children}</NavigationContainer>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
