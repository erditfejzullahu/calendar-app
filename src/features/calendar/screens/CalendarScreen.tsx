import {useCallback} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Switch, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {Screen} from '@shared/components/Screen';
import {AppHeader} from '@shared/components/AppHeader';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {useFadeIn} from '@shared/hooks/useFadeIn';
import {
  useMeetingsActions,
  useMeetingsLoading,
  useUserRole,
} from '@store/meetings/meetings.selectors';
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
  const {refresh, setAdminCalendarShowAll} = useMeetingsActions();
  const refreshing = useMeetingsLoading();
  const userRole = useUserRole();
  const adminShowAllStored = useMeetingsStore(s => s.adminCalendarShowAllGlobal);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <Screen edges={['top']}>
      <AppHeader title="Calendar" subtitle="Tap any day to view or add meetings" />

      {userRole === 'admin' ? (
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
          contentContainerStyle={styles.scrollContent}
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
          <CalendarMonthHeader
            year={year}
            month={month}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />

          <View style={styles.card}>
            <CalendarWeekdays />
            <CalendarGrid
              year={year}
              month={month}
              selectedDateISO={ui.selectedDate}
              onSelectDate={ui.selectDate}
            />
          </View>
        </ScrollView>
      </Animated.View>

      <DayMeetingsSheet
        visible={ui.daySheetOpen}
        dateISO={ui.selectedDate}
        onClose={ui.closeDay}
        onCreate={ui.openCreate}
        onSelectMeeting={ui.openMeeting}
      />

      <CreateMeetingModal
        visible={ui.createOpen}
        dateISO={ui.selectedDate}
        onClose={ui.closeCreate}
      />

      <MeetingDetailsModal meeting={ui.activeMeeting} onClose={ui.closeMeeting} />
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
