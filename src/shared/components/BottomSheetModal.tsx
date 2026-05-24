import {memo, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import {FullWindowOverlay} from 'react-native-screens';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {AppText} from './Text';

type Props = {
  children: ReactNode;
  visible: boolean;
  onClose: () => void;
  title?: string;
  maxHeight?: number;
};

const OVERLAY_MS = 220;
const CLOSE_MS = 240;
/** Minimum downward px to trigger dismiss on release. */
const DISMISS_Y = 80;
/** Minimum downward velocity (px/s) to trigger dismiss on release. */
const DISMISS_VY = 500;

function BottomSheetModalInner({visible, onClose, title, children, maxHeight}: Props) {
  const {height: windowHeight} = useWindowDimensions();
  const travel = Math.min(windowHeight * 0.5, 600);

  const [mounted, setMounted] = useState(visible);
  const overlay = useSharedValue(0);
  const translateY = useSharedValue(travel);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const isPresented = visible || mounted;

  const finalizeDismiss = useCallback(() => {
    if (!visibleRef.current) setMounted(false);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    setMounted(true);
    cancelAnimation(overlay);
    cancelAnimation(translateY);
    overlay.value = 0;
    translateY.value = travel;
    overlay.value = withTiming(1, {duration: OVERLAY_MS, easing: Easing.out(Easing.quad)});
    translateY.value = withSpring(0, {damping: 22, stiffness: 200, mass: 0.85});
  }, [visible, travel, overlay, translateY]);

  useEffect(() => {
    if (visible || !mounted) return;
    cancelAnimation(overlay);
    cancelAnimation(translateY);
    overlay.value = withTiming(0, {duration: 160, easing: Easing.in(Easing.quad)});
    translateY.value = withTiming(
      travel,
      {duration: CLOSE_MS, easing: Easing.in(Easing.cubic)},
      finished => {
        if (finished) runOnJS(finalizeDismiss)();
      },
    );
  }, [visible, mounted, overlay, translateY, travel, finalizeDismiss]);

  const pan = Gesture.Pan()
    .activeOffsetY([0, 8])
    .onUpdate(e => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd(e => {
      if (e.translationY > DISMISS_Y || e.velocityY > DISMISS_VY) {
        overlay.value = withTiming(0, {duration: 150});
        translateY.value = withTiming(
          travel,
          {duration: CLOSE_MS, easing: Easing.in(Easing.cubic)},
          finished => {
            if (finished) runOnJS(finalizeDismiss)();
          },
        );
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, {damping: 22, stiffness: 200});
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({opacity: overlay.value}));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  if (!isPresented) return null;

  const sheetBody = (
    <GestureHandlerRootView style={styles.flex}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbAvoider}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        pointerEvents="box-none">
        <Animated.View
          collapsable={false}
          style={[styles.sheet, maxHeight ? {maxHeight} : null, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.dragArea}>
              <View style={styles.grabber} />
              {title ? (
                <AppText variant="titleMd" style={styles.title}>
                  {title}
                </AppText>
              ) : null}
            </View>
          </GestureDetector>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );

  // iOS RN Modal stacks poorly (invisible overlays block touches). FullWindowOverlay
  // renders above the native hierarchy without Modal stacking bugs.
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
        {sheetBody}
      </FullWindowOverlay>
    );
  }

  return (
    <Modal
      transparent
      animationType="none"
      hardwareAccelerated
      visible={isPresented}
      statusBarTranslucent
      onRequestClose={onClose}>
      {sheetBody}
    </Modal>
  );
}

export default memo(BottomSheetModalInner);

BottomSheetModalInner.displayName = 'BottomSheetModal';

const styles = StyleSheet.create({
  flex: {flex: 1},
  overlay: {backgroundColor: colors.overlay},
  kbAvoider: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  dragArea: {
    paddingTop: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {marginBottom: spacing.md},
});
