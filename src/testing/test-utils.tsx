import React, {ReactElement} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {render, RenderOptions} from '@testing-library/react-native';

const baseInsets = {top: 0, right: 0, bottom: 0, left: 0};

/**
 * Lightweight provider shell for primitives that rely on safe-area hooks.
 */
function TestProviders({children}: {children: React.ReactNode}) {
  return (
    <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: baseInsets}}>
      {children}
    </SafeAreaProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {...options, wrapper: TestProviders});
}
