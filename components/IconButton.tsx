import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Props {
  icon: IoniconName;
  onPress: () => void;
  label?: string;
  active?: boolean;
  size?: number;
  variant?: 'solid' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  label,
  active = false,
  size = 24,
  variant = 'ghost',
  disabled = false,
  style,
}: Props) {
  const bg =
    variant === 'solid'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : active
          ? colors.surfaceAlt
          : 'transparent';
  const tint =
    variant === 'solid' || variant === 'danger'
      ? '#fff'
      : active
        ? colors.primary
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      accessibilityState={{ selected: active, disabled }}
    >
      <View style={styles.inner}>
        <Ionicons name={icon} size={size} color={tint} />
        {label ? (
          <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
