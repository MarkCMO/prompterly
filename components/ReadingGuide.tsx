import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

interface Props {
  ratio: number;
  visible: boolean;
}

/** Centered horizontal markers showing where to fix your gaze. */
export function ReadingGuide({ ratio, visible }: Props) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.row, { top: `${ratio * 100}%` }]}
    >
      <View style={styles.triangleLeft} />
      <View style={styles.line} />
      <View style={styles.triangleRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  triangleLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.primary,
  },
  triangleRight: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.primary,
  },
});
