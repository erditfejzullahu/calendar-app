import {memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Dimensions, Platform, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '@shared/components/Text';
import {colors, palette} from '@shared/theme/colors';
import {useAuthStore} from '@store/auth/auth.store';

const MIN_SPLASH_MS = 2_100;
const EXIT_MS = 480;

/** Animated overlay shown on cold start until auth settles and copy has time to read. */
const SplashBackdrop = memo(
  ({
    dismiss,
    onExitComplete,
  }: {
    dismiss: boolean;
    onExitComplete: () => void;
  }) => {
    const inset = useSafeAreaInsets();
    const {width: vw} = Dimensions.get('window');

    const shellOpacity = useSharedValue(0);
    const blobA = useSharedValue(0);
    const blobB = useSharedValue(0);
    const markScale = useSharedValue(0.92);
    const markOpacity = useSharedValue(0);
    const titleOpacity = useSharedValue(0);
    const titleY = useSharedValue(14);
    const bodyOpacity = useSharedValue(0);
    const bodyY = useSharedValue(10);
    const stageOpacity = useSharedValue(1);

    const exitedRef = useRef(false);
    const completeOnce = useCallback(() => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      onExitComplete();
    }, [onExitComplete]);

    useEffect(() => {
      const easing = Easing.out(Easing.cubic);
      shellOpacity.value = withTiming(1, {duration: 420, easing});
      blobA.value = withDelay(
        80,
        withTiming(1, {duration: 900, easing: Easing.out(Easing.quad)}),
      );
      blobB.value = withDelay(
        200,
        withTiming(1, {duration: 900, easing: Easing.out(Easing.quad)}),
      );
      markOpacity.value = withDelay(280, withTiming(1, {duration: 420, easing}));
      markScale.value = withDelay(
        280,
        withTiming(1, {duration: 520, easing: Easing.out(Easing.back(1.1))}),
      );
      titleOpacity.value = withDelay(
        420,
        withTiming(1, {duration: 440, easing: Easing.out(Easing.cubic)}),
      );
      titleY.value = withDelay(
        420,
        withTiming(0, {duration: 520, easing: Easing.out(Easing.cubic)}),
      );
      bodyOpacity.value = withDelay(
        560,
        withTiming(1, {duration: 480, easing: Easing.out(Easing.cubic)}),
      );
      bodyY.value = withDelay(
        560,
        withTiming(0, {duration: 560, easing: Easing.out(Easing.cubic)}),
      );
    }, [
      blobA,
      blobB,
      bodyOpacity,
      bodyY,
      markOpacity,
      markScale,
      shellOpacity,
      titleOpacity,
      titleY,
    ]);

    useEffect(() => {
      if (!dismiss) return;
      stageOpacity.value = withTiming(
        0,
        {
          duration: EXIT_MS,
          easing: Easing.inOut(Easing.cubic),
        },
        finished => {
          if (finished) runOnJS(completeOnce)();
        },
      );
    }, [completeOnce, dismiss, stageOpacity]);

    const overlayStyle = useAnimatedStyle(() => ({
      opacity: shellOpacity.value * stageOpacity.value,
    }));

    const blobAStyle = useAnimatedStyle(() => ({
      opacity: 0.28 * blobA.value * stageOpacity.value,
      transform: [{translateX: -vw * 0.08}, {rotate: '-14deg'}, {scale: 1 + blobA.value * 0.04}],
    }));

    const blobBStyle = useAnimatedStyle(() => ({
      opacity: 0.2 * blobB.value * stageOpacity.value,
      transform: [{translateX: vw * 0.06}, {rotate: '18deg'}, {scale: 1 + blobB.value * 0.05}],
    }));

    const markWrapStyle = useAnimatedStyle(() => ({
      opacity: markOpacity.value * stageOpacity.value,
      transform: [{scale: markScale.value}],
    }));

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleOpacity.value * stageOpacity.value,
      transform: [{translateY: titleY.value}],
    }));

    const bodyStyle = useAnimatedStyle(() => ({
      opacity: bodyOpacity.value * stageOpacity.value,
      transform: [{translateY: bodyY.value}],
    }));

    return (
      <Animated.View
        accessibilityElementsHidden={dismiss}
        importantForAccessibility={dismiss ? 'no-hide-descendants' : 'yes'}
        pointerEvents={dismiss ? 'none' : 'auto'}
        style={[styles.fill, overlayStyle]}>
        <Animated.View style={[styles.blob, styles.blobTop, blobAStyle]} />
        <Animated.View style={[styles.blob, styles.blobBottom, blobBStyle]} />

        <View
          style={[styles.centerBlock, {paddingTop: inset.top + 32, paddingBottom: inset.bottom + 24}]}>
          <Animated.View style={markWrapStyle}>
            <SplashCalendarMark />
          </Animated.View>

          <Animated.View style={[styles.textBlock, titleStyle]}>
            <AppText variant="displayMd" align="center" style={styles.heroTitle}>
              Stay in{' '}
              <AppText variant="displayMd" color={colors.primary} style={styles.heroAccent}>
                sync
              </AppText>{' '}
              with everyone
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.textBlock, bodyStyle]}>
            <AppText variant="body" color={colors.textMuted} align="center" style={styles.tagline}>
              Plan meetings together, invite participants, and keep every booking aligned — synced
              securely in the cloud across your devices.
            </AppText>
          </Animated.View>
        </View>
      </Animated.View>
    );
  },
);

SplashBackdrop.displayName = 'SplashBackdrop';

function SplashCalendarMark(): ReactNode {
  return (
    <View style={styles.mark}>
      <View style={styles.markRow}>
        <View style={[styles.markCell, styles.markAccent]} />
        <View style={styles.markCell} />
      </View>
      <View style={styles.markRow}>
        <View style={styles.markCell} />
        <View style={[styles.markCell, styles.markAccentSoft]} />
      </View>
    </View>
  );
}

/** Wraps navigator; shows branded splash until auth hydrates & minimum dwell time elapsed. */
export const SplashGate = ({children}: {children: ReactNode}) => {
  const authReady = useAuthStore(s => s.status !== 'initializing');
  const splashStartedAt = useRef(Date.now());

  const [dismissBackdrop, setDismissBackdrop] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);

  useEffect(() => {
    if (!authReady) return;

    const remaining = MIN_SPLASH_MS - (Date.now() - splashStartedAt.current);
    const id = setTimeout(() => setDismissBackdrop(true), Math.max(remaining, 0));
    return () => clearTimeout(id);
  }, [authReady]);

  const onExitComplete = useCallback(() => setSplashMounted(false), []);

  const layer = useMemo(() => {
    if (!splashMounted) return null;
    return (
      <View
        style={[styles.layer, dismissBackdrop && styles.layerPassThrough]}
        collapsable={false}>
        <SplashBackdrop dismiss={dismissBackdrop} onExitComplete={onExitComplete} />
      </View>
    );
  }, [splashMounted, dismissBackdrop, onExitComplete]);

  return (
    <View style={styles.flex}>
      {children}
      {layer}
    </View>
  );
};

SplashGate.displayName = 'SplashGate';

const styles = StyleSheet.create({
  flex: {flex: 1},
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    ...(Platform.OS === 'android' ? {elevation: 999} : {}),
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  layerPassThrough: {
    pointerEvents: 'none',
    elevation: 0,
  },
  fill: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    width: '118%',
    height: '54%',
    backgroundColor: palette.brandSoft,
  },
  blobTop: {
    top: '-8%',
    left: '-22%',
  },
  blobBottom: {
    bottom: '-22%',
    left: '-38%',
    width: '128%',
    height: '62%',
    backgroundColor: '#EDEBFF',
  },
  centerBlock: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 24,
  },
  textBlock: {
    maxWidth: 360,
    gap: 8,
    alignSelf: 'center',
  },
  heroTitle: {
    letterSpacing: -0.35,
  },
  heroAccent: {
    fontWeight: '700',
  },
  tagline: {
    paddingHorizontal: 4,
    lineHeight: 22,
  },
  mark: {
    width: 72,
    height: 72,
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: palette.black,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.06,
    shadowRadius: 20,
    gap: 6,
    ...Platform.select({android: {elevation: 3}, default: {}}),
  },
  markRow: {flex: 1, flexDirection: 'row', gap: 6},
  markCell: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: palette.gray100,
  },
  markAccent: {
    backgroundColor: palette.brand600,
  },
  markAccentSoft: {
    backgroundColor: palette.brand500,
    opacity: 0.72,
  },
});
