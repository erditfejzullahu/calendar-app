import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthStack} from './AuthStack';
import {MainTabs} from './MainTabs';
import type {RootStackParamList} from './types';
import {fadeStackOptions} from './transitions';
import {useAuthStatus} from '@store/auth/auth.selectors';
import {LoadingOverlay} from '@shared/components/LoadingOverlay';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The single auth gate: while initializing we render a splash; otherwise
 * we mount either the AuthStack or the MainTabs. Switching between the two
 * uses a fade transition so it feels seamless after sign-in.
 */
export const RootNavigator = () => {
  const status = useAuthStatus();

  if (status === 'initializing') return <LoadingOverlay />;

  return (
    <Stack.Navigator screenOptions={fadeStackOptions}>
      {status === 'authenticated' ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};
