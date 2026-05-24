import {useCallback, useMemo, useState} from 'react';
import {Alert, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {Screen} from '@shared/components/Screen';
import {AppHeader} from '@shared/components/AppHeader';
import {Button} from '@shared/components/Button';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {useFadeIn} from '@shared/hooks/useFadeIn';
import {useAuthActions} from '@store/auth/auth.selectors';
import {useMeetingsActions, useMeetingsLoading, useUserRole} from '@store/meetings/meetings.selectors';
import {MeetingDetailsModal} from '@features/calendar/components/MeetingDetailsModal';
import type {Meeting} from '@app-types/meeting';
import {EditProfileModal} from '../components/EditProfileModal';
import {ProfileHeader} from '../components/ProfileHeader';
import {StatsGrid} from '../components/StatsGrid';
import {UpcomingMeetingsList} from '../components/UpcomingMeetingsList';
import {useProfileViewModel} from '../hooks/useProfileViewModel';
import {userRoleLabel} from '../utils/user-role-display';

export const ProfileScreen = () => {
  const {user, stats, upcoming} = useProfileViewModel();
  const {signOut} = useAuthActions();
  const {refresh} = useMeetingsActions();
  const refreshing = useMeetingsLoading();
  const userRole = useUserRole();
  const animatedStyle = useFadeIn();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const roleLabel = useMemo(() => userRoleLabel(userRole), [userRole]);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => signOut().catch(() => undefined),
      },
    ]);
  }, [signOut]);

  if (!user) return null; // route guard ensures this, but keeps TS happy

  return (
    <Screen edges={['top']}>
      <AppHeader title="Profile" subtitle="Your meeting activity at a glance" />

      <Animated.View style={[styles.body, animatedStyle]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }>
          <ProfileHeader user={user} roleLabel={roleLabel} />

          <StatsGrid
            created={stats.created}
            edited={stats.edited}
            deleted={stats.deleted}
            upcoming={stats.upcoming}
          />

          <UpcomingMeetingsList meetings={upcoming} onMeetingPress={setSelectedMeeting} />

          <View style={styles.footer}>
            <Button
              label="Edit profile"
              onPress={() => setEditProfileOpen(true)}
              fullWidth
              size="lg"
            />
            <Button
              label="Sign out"
              variant="secondary"
              onPress={confirmSignOut}
              fullWidth
              style={styles.signOutSpacing}
            />
          </View>
        </ScrollView>
      </Animated.View>

      <MeetingDetailsModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      <EditProfileModal
        key={`${user.uid}-${user.email ?? ''}`}
        visible={editProfileOpen}
        user={user}
        onClose={() => setEditProfileOpen(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {flex: 1, backgroundColor: colors.bg},
  scroll: {paddingBottom: spacing['3xl']},
  footer: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  signOutSpacing: {marginTop: spacing.sm},
});
