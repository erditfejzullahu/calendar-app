import {StyleSheet, View} from 'react-native';
import {spacing} from '@shared/theme/spacing';
import {StatCard} from './StatCard';
import { memo } from 'react';

type Props = {
  created: number;
  edited: number;
  deleted: number;
  upcoming: number;
};

export const StatsGrid = memo(({created, edited, deleted, upcoming}: Props) => (
  <View style={styles.grid}>
    <View style={styles.row}>
      <StatCard label="Created" value={created} variant="primary" />
      <StatCard label="Edited" value={edited} variant="warning" />
    </View>
    <View style={styles.row}>
      <StatCard label="Deleted" value={deleted} variant="danger" />
      <StatCard label="Upcoming" value={upcoming} variant="success" />
    </View>
  </View>
));

const styles = StyleSheet.create({
  grid: {paddingHorizontal: spacing.xl, gap: spacing.md},
  row: {flexDirection: 'row', gap: spacing.md},
});
