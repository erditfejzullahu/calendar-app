import {memo, ReactNode} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';

type Props = {
  children: ReactNode;
  padded?: boolean;
  edges?: ReadonlyArray<Edge>;
  background?: string;
  style?: ViewStyle;
};

export const Screen = memo(({
  children,
  padded = false,
  edges = ['top', 'bottom'],
  background = colors.bg,
  style,
}: Props) => {
  return (
    <SafeAreaView edges={edges} style={[styles.root, {backgroundColor: background}]}>
      <View style={[styles.content, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {flex: 1},
  padded: {paddingHorizontal: spacing.xl, paddingVertical: spacing.lg},
});
