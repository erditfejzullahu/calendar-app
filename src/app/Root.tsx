import {StatusBar} from 'react-native';
import {AppProviders} from './providers/AppProviders';
import {RootNavigator} from './navigation/RootNavigator';
import {useAppBootstrap} from './hooks/useAppBootstrap';

export const Root = () => {
  useAppBootstrap();
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </AppProviders>
  );
};
