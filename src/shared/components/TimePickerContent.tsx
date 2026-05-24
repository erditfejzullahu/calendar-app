import {memo, useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from './Button';
import {AppText} from './Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {isValidHHmm, minutesToHHmm} from '@shared/utils/time';

const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = ROW_HEIGHT * 5;
const VERTICAL_PADDING = (VIEWPORT_HEIGHT - ROW_HEIGHT) / 2;

const HOURS = Array.from({length: 24}, (_, i) => i);
const MINUTES = Array.from({length: 60}, (_, i) => i);

type SnapColumnProps = {
  data: number[];
  scrollRef: React.RefObject<ScrollView | null>;
  onPick: (value: number) => void;
};

function SnapColumn({data, scrollRef, onPick}: SnapColumnProps) {
  const flushScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      let idx = Math.round(y / ROW_HEIGHT);
      idx = Math.max(0, Math.min(data.length - 1, idx));
      scrollRef.current?.scrollTo({y: idx * ROW_HEIGHT, animated: true});
      onPick(data[idx] ?? 0);
    },
    [data, onPick, scrollRef],
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelScroller}
      contentContainerStyle={styles.wheelContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={flushScrollEnd}
      onScrollEndDrag={flushScrollEnd}>
      {data.map(val => (
        <View key={String(val)} style={styles.wheelRow}>
          <AppText variant="titleMd" style={styles.wheelLabel}>
            {val < 10 ? `0${val}` : String(val)}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}

export type TimePickerContentProps = {
  active: boolean;
  initialHHmm: string;
  onClose: () => void;
  onConfirm: (hhmm: string) => void;
};

export const TimePickerContent = memo(
  ({active, initialHHmm, onClose, onConfirm}: TimePickerContentProps) => {
    const insets = useSafeAreaInsets();
    const scrollH = useRef<ScrollView>(null);
    const scrollM = useRef<ScrollView>(null);

    const [hour, setHour] = useState(0);
    const [minute, setMinute] = useState(0);

    useLayoutEffect(() => {
      if (!active) return;
      let h = 9;
      let m = 0;
      if (isValidHHmm(initialHHmm)) {
        const parts = initialHHmm.split(':').map(Number);
        h = Number.isFinite(parts[0]) ? parts[0]! : h;
        m = Number.isFinite(parts[1]) ? parts[1]! : m;
      }
      setHour(h);
      setMinute(m);

      requestAnimationFrame(() => {
        scrollH.current?.scrollTo({y: h * ROW_HEIGHT, animated: false});
        scrollM.current?.scrollTo({y: m * ROW_HEIGHT, animated: false});
      });
    }, [active, initialHHmm]);

    const summary = useMemo(() => minutesToHHmm(hour * 60 + minute), [hour, minute]);

    const apply = useCallback(() => {
      onConfirm(summary);
      onClose();
    }, [onConfirm, onClose, summary]);

    return (
      <>
        <View style={styles.summaryRow}>
          <AppText variant="caption" color={colors.textMuted}>
            Selected
          </AppText>
          <AppText variant="titleMd">{summary}</AppText>
        </View>

        <View style={[styles.viewport, {height: VIEWPORT_HEIGHT}]}>
          <View pointerEvents="none" style={styles.selectionBand} />

          <View style={styles.wheelsRow}>
            <SnapColumn data={HOURS} scrollRef={scrollH} onPick={setHour} />
            <View style={styles.colonWrap} pointerEvents="none">
              <AppText variant="titleMd" style={styles.colon}>
                :
              </AppText>
            </View>
            <SnapColumn data={MINUTES} scrollRef={scrollM} onPick={setMinute} />
          </View>
        </View>

        <View style={{paddingBottom: insets.bottom}}>
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" style={styles.halfBtn} onPress={onClose} />
            <Button label="Apply" style={styles.halfBtn} onPress={apply} />
          </View>

          <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
            Scroll hours and minutes, then Apply
          </AppText>
        </View>
      </>
    );
  },
);

TimePickerContent.displayName = 'TimePickerContent';

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  viewport: {
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
    backgroundColor: colors.surface,
  },
  selectionBand: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: VERTICAL_PADDING,
    height: ROW_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.primary}55`,
    backgroundColor: `${colors.primary}0c`,
    borderRadius: radius.sm,
    zIndex: 2,
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    flex: 1,
    zIndex: 1,
  },
  wheelScroller: {
    width: 80,
    maxHeight: VIEWPORT_HEIGHT,
  },
  wheelContent: {
    paddingVertical: VERTICAL_PADDING,
  },
  wheelRow: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelLabel: {
    opacity: 0.95,
  },
  colonWrap: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginHorizontal: spacing.xs,
  },
  colon: {
    opacity: 0.85,
  },
  actions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  halfBtn: {flex: 1},
  hint: {marginTop: spacing.md, textAlign: 'center'},
});
