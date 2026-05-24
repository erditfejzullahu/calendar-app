import {StatusBar} from 'react-native';
import {AppProviders} from './providers/AppProviders';
import {RootNavigator} from './navigation/RootNavigator';
import {useAppBootstrap} from './hooks/useAppBootstrap';
import {SplashGate} from './components/SplashGate';

export const Root = () => {
  useAppBootstrap();
  return (
    <AppProviders>
      <SplashGate>
        <>
          <StatusBar barStyle="light-content" />
          <RootNavigator />
        </>
      </SplashGate>
    </AppProviders>
  );
};
