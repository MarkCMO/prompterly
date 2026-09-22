import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontFamilies,
  radius,
  spacing,
  textColorPresets,
  type FontFamilyValue,
} from '@/constants/theme';
import { useSettings, type CameraFacing } from '@/lib/settings';

const COUNTDOWN_OPTIONS = [0, 3, 5, 10];

export default function SettingsScreen() {
  const s = useSettings();
  const insets = useSafeAreaInsets();

  const confirmReset = () => {
    Alert.alert('Reset settings', 'Restore all teleprompter settings to their defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => s.reset() },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
    >
      {/* TELELUME PRO */}
      <Section title="Telelume Pro" icon="sparkles-outline">
        <Pressable
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [styles.upgradeRow, pressed && styles.upgradePressed]}
          accessibilityRole="button"
          accessibilityLabel="Unlock Telelume Pro"
        >
          <View style={styles.rowLabelWrap}>
            <Text style={styles.rowLabel}>Unlock Telelume Pro</Text>
            <Text style={styles.rowHint}>
              Unlimited teleprompter sessions. View plans and subscribe.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </Section>

      {/* CAMERA */}
      <Section title="Camera" icon="videocam-outline">
        <Row
          label="Record video"
          hint="Off uses a plain backdrop for an external teleprompter rig."
        >
          <Switch
            value={s.cameraEnabled}
            onValueChange={(v) => s.set('cameraEnabled', v)}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor="#fff"
          />
        </Row>

        <Row label="Facing">
          <Segmented<CameraFacing>
            value={s.cameraFacing}
            options={[
              { label: 'Front', value: 'front' },
              { label: 'Back', value: 'back' },
            ]}
            onChange={(v) => s.set('cameraFacing', v)}
          />
        </Row>

        <SliderRow
          label="Text dimming"
          value={s.dim}
          min={0}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => s.set('dim', v)}
        />
      </Section>

      {/* TEXT */}
      <Section title="Text" icon="text-outline">
        <SliderRow
          label="Font size"
          value={s.fontSize}
          min={18}
          max={80}
          step={1}
          format={(v) => `${Math.round(v)} pt`}
          onChange={(v) => s.set('fontSize', Math.round(v))}
        />
        <SliderRow
          label="Line spacing"
          value={s.lineHeight}
          min={1}
          max={2.2}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => s.set('lineHeight', v)}
        />
        <SliderRow
          label="Side margin"
          value={s.margin}
          min={0}
          max={64}
          step={2}
          format={(v) => `${Math.round(v)} px`}
          onChange={(v) => s.set('margin', Math.round(v))}
        />

        <Row label="Typeface" stacked>
          <Segmented<FontFamilyValue>
            value={s.fontFamily}
            options={fontFamilies.map((f) => ({ label: f.label, value: f.value }))}
            onChange={(v) => s.set('fontFamily', v)}
          />
        </Row>

        <Row label="Color" stacked>
          <View style={styles.swatchRow}>
            {textColorPresets.map((c) => {
              const active = s.textColor.toUpperCase() === c.toUpperCase();
              return (
                <Pressable
                  key={c}
                  onPress={() => s.set('textColor', c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Text color ${c}`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    active && styles.swatchActive,
                  ]}
                >
                  {active ? <Ionicons name="checkmark" size={18} color="#000" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Row>
      </Section>

      {/* SCROLL */}
      <Section title="Scroll & record" icon="play-outline">
        <SliderRow
          label="Scroll speed"
          value={s.speed}
          min={1}
          max={100}
          step={1}
          format={(v) => `${Math.round(v)}`}
          onChange={(v) => s.set('speed', Math.round(v))}
        />

        <Row label="Countdown" stacked>
          <Segmented<number>
            value={s.countdown}
            options={COUNTDOWN_OPTIONS.map((n) => ({
              label: n === 0 ? 'Off' : `${n}s`,
              value: n,
            }))}
            onChange={(v) => s.set('countdown', v)}
          />
        </Row>

        <Row label="Reading guide" hint="A centered bar marking where to look.">
          <Switch
            value={s.showReadingGuide}
            onValueChange={(v) => s.set('showReadingGuide', v)}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor="#fff"
          />
        </Row>

        <Row label="Mirror text" hint="Flip horizontally for beam-splitter rigs.">
          <Switch
            value={s.mirror}
            onValueChange={(v) => s.set('mirror', v)}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor="#fff"
          />
        </Row>
      </Section>

      <Pressable
        style={styles.resetBtn}
        onPress={confirmReset}
        accessibilityRole="button"
        accessibilityLabel="Reset settings to defaults"
      >
        <Ionicons name="refresh-outline" size={18} color={colors.danger} />
        <Text style={styles.resetText}>Reset to defaults</Text>
      </Pressable>

      <Text style={styles.version}>Telelume v{Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  hint,
  stacked = false,
  children,
}: {
  label: string;
  hint?: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={stacked ? styles.rowChildStacked : undefined}>{children}</View>
    </View>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{format(value)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.surfaceAlt}
        thumbTintColor="#fff"
      />
    </View>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  upgradePressed: { opacity: 0.6 },
  rowLabelWrap: { flexShrink: 1, gap: 2 },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  rowChildStacked: { width: '100%' },
  sliderRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 2,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  swatchRow: { flexDirection: 'row', gap: spacing.sm },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#fff' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
