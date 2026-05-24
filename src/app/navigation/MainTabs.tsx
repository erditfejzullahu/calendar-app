import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Easing} from 'react-native';
import {CalendarScreen} from '@features/calendar/screens/CalendarScreen';
import {ProfileScreen} from '@features/profile/screens/ProfileScreen';
import {BottomTabBar} from '@shared/components/BottomTabBar';
import type {MainTabsParamList} from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

/**
 * Tabs default to `animation: 'none'` and detach inactive scenes on native,
 * which makes Calendar ↔ Profile feel instant/off. Explicit `animation` uses
 * the library interpolators (`shift` = horizontal swipe between peers).
 */
const tabTransition = {
  animation: 'shift' as const,
  lazy: false,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    },
  },
};

export const MainTabs = () => (
  <Tab.Navigator
    detachInactiveScreens={false}
    screenOptions={{
      headerShown: false,
      ...tabTransition,
    }}
    tabBar={props => <BottomTabBar {...props} />}>
    <Tab.Screen
      name="CalendarTab"
      component={CalendarScreen}
      options={{tabBarLabel: 'Calendar'}}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{tabBarLabel: 'Profile'}}
    />
  </Tab.Navigator>
);
