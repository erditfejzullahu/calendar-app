import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import { memo } from 'react';

type Props = {prompt: string; cta: string; onPress: () => void};

export const AuthFooterLink = memo(({prompt, cta, onPress}: Props) => (
  <View style={styles.row}>
    <AppText variant="body" color={colors.textMuted}>
      {prompt}{' '}
    </AppText>
    <Pressable onPress={onPress} hitSlop={10}>
      <AppText variant="bodyStrong" color={colors.primary}>
        {cta}
      </AppText>
    </Pressable>
  </View>
));

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
});
