import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SignInScreen} from '@features/auth/screens/SignInScreen';
import {SignUpScreen} from '@features/auth/screens/SignUpScreen';
import type {AuthStackParamList} from './types';
import {defaultStackOptions} from './transitions';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => (
  <Stack.Navigator screenOptions={defaultStackOptions} initialRouteName="SignIn">
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>
);
