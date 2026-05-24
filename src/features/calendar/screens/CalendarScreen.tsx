import {useCallback} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Switch, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {Screen} from '@shared/components/Screen';
import {AppHeader} from '@shared/components/AppHeader';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {useFadeIn} from '@shared/hooks/useFadeIn';
import {
  useMeetingsActions,
  useMeetingsInitialHydrated,
  useMeetingsLoading,
  useUserRole,
} from '@store/meetings/meetings.selectors';
import {useAuthStore} from '@store/auth/auth.store';
import {useMeetingsStore} from '@store/meetings/meetings.store';
import {CalendarMonthHeader} from '../components/CalendarMonthHeader';
import {CalendarWeekdays} from '../components/CalendarWeekdays';
import {CalendarGrid} from '../components/CalendarGrid';
import {DayMeetingsSheet} from '../components/DayMeetingsSheet';
import {CreateMeetingModal} from '../components/CreateMeetingModal';
import {MeetingDetailsModal} from '../components/MeetingDetailsModal';
import {useCalendarNavigation} from '../hooks/useCalendarNavigation';
import {useCalendarScreenUI} from '../hooks/useCalendarScreenUI';

export const CalendarScreen = () => {
  const {year, month, goPrev, goNext, goToday} = useCalendarNavigation();
  const ui = useCalendarScreenUI();
  const animatedStyle = useFadeIn();
  const authStatus = useAuthStore(s => s.status);
  const {refresh, setAdminCalendarShowAll} = useMeetingsActions();
  const refreshing = useMeetingsLoading();
  const meetingsHydrated = useMeetingsInitialHydrated();
  const userRole = useUserRole();
  const adminShowAllStored = useMeetingsStore(s => s.adminCalendarShowAllGlobal);

  const calendarBootstrapping =
    authStatus === 'authenticated' && !meetingsHydrated && refreshing;

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const activeSheet = ui.createOpen
    ? 'create'
    : ui.activeMeeting
      ? 'meeting'
      : ui.daySheetOpen
        ? 'day'
        : null;

  return (
    <Screen edges={['top']}>
      <AppHeader title="Calendar" subtitle="Tap any day to view or add meetings" />

      {calendarBootstrapping ? null : userRole === 'admin' ? (
        <View style={styles.adminBar}>
          <View style={styles.adminCopy}>
            <AppText variant="bodyStrong">All organizers</AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.adminHint}>
              Show every booking and who owns it across the tenant.
            </AppText>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Show all organizers’ meetings on the calendar"
            value={adminShowAllStored}
            onValueChange={setAdminCalendarShowAll}
            trackColor={{false: colors.border, true: colors.primarySoft}}
            thumbColor={adminShowAllStored ? colors.primary : colors.surface}
          />
        </View>
      ) : null}

      <Animated.View style={[styles.body, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            calendarBootstrapping ? styles.scrollContentBootstrapping : null,
          ]}
          scrollEnabled={!calendarBootstrapping}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={calendarBootstrapping ? true : refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }>
          <CalendarMonthHeader
            year={year}
            month={month}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />

          {calendarBootstrapping ? (
            <View style={styles.bootstrapPanel} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="body" color={colors.textMuted} align="center" style={styles.bootstrapCopy}>
                Loading your calendar…
              </AppText>
            </View>
          ) : (
            <View style={styles.card}>
              <CalendarWeekdays />
              <CalendarGrid
                year={year}
                month={month}
                selectedDateISO={ui.selectedDate}
                onSelectDate={ui.selectDate}
              />
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {activeSheet === 'day' ? (
        <DayMeetingsSheet
          visible
          dateISO={ui.selectedDate}
          onClose={ui.closeDay}
          onCreate={ui.openCreate}
          onSelectMeeting={ui.openMeeting}
        />
      ) : null}

      {activeSheet === 'create' ? (
        <CreateMeetingModal
          visible
          dateISO={ui.selectedDate}
          onClose={ui.closeCreate}
        />
      ) : null}

      {activeSheet === 'meeting' && ui.activeMeeting ? (
        <MeetingDetailsModal meeting={ui.activeMeeting} onClose={ui.closeMeeting} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  adminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminCopy: {flex: 1, gap: spacing.xxs},
  adminHint: {lineHeight: 16},
  body: {flex: 1, backgroundColor: colors.bg},
  scrollView: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: spacing.md},
  scrollContentBootstrapping: {flexGrow: 1},
  bootstrapPanel: {
    flexGrow: 1,
    minHeight: 280,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bootstrapCopy: {lineHeight: 22, maxWidth: 260},
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
