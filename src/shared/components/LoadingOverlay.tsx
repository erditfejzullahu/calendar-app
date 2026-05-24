import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {colors} from '@shared/theme/colors';

export const LoadingOverlay = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
