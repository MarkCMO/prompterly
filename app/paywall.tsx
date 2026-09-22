import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/constants/theme';
import { getPlans, purchasePlan, restorePro, type Plan, type PlanKey } from '@/lib/purchases';
import { FREE_SESSIONS } from '@/lib/storage';

const PRIVACY_URL = 'https://markcmo.com/telelume-privacy';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PERKS = [
  'Unlimited teleprompter sessions',
  'Read your script over the live camera',
  'Unlimited saved scripts',
  'Smooth 60fps adjustable scrolling',
  'Mirror mode + custom text colors',
  'Reading guide and countdown timer',
];

// Fallback prices shown only if the store hasn't loaded yet.
const FALLBACK: Record<PlanKey, string> = { weekly: '$4.99', monthly: '$14.99' };

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<PlanKey>('weekly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPlans()
      .then((p) => {
        if (p.length) setPlans(p);
      })
      .catch(() => {});
  }, []);

  const onSuccess = useCallback(() => {
    if (next) router.replace({ pathname: '/teleprompter/[id]', params: { id: next } });
    else router.back();
  }, [next]);

  const priceFor = (key: PlanKey) => plans.find((p) => p.key === key)?.price ?? FALLBACK[key];

  const onContinue = useCallback(async () => {
    const plan = plans.find((p) => p.key === selected);
    setBusy(true);
    try {
      if (!plan) throw new Error('Plans are still loading. Please try again in a moment.');
      const ok = await purchasePlan(plan.pkg);
      if (ok) onSuccess();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err?.userCancelled) {
        Alert.alert('Purchase failed', err?.message || 'Could not complete the purchase. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [plans, selected, onSuccess]);

  const onRestore = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await restorePro();
      if (ok) onSuccess();
      else Alert.alert('Nothing to restore', 'We could not find an active subscription for this account.');
    } catch {
      Alert.alert('Restore failed', 'Could not restore purchases. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  const renderPlan = (key: PlanKey, period: string, featured: boolean) => {
    const active = selected === key;
    return (
      <Pressable
        key={key}
        onPress={() => setSelected(key)}
        style={[styles.plan, active && styles.planActive]}
        accessibilityRole="button"
        accessibilityLabel={`${priceFor(key)} per ${period}`}
      >
        {featured && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BEST VALUE</Text>
          </View>
        )}
        <View style={styles.radio}>
          {active && <View style={styles.radioDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{key === 'weekly' ? 'Weekly' : 'Monthly'}</Text>
          <Text style={styles.planSub}>Billed every {period}, cancel anytime</Text>
        </View>
        <Text style={styles.planPrice}>
          {priceFor(key)}
          <Text style={styles.planPer}>/{period === 'week' ? 'wk' : 'mo'}</Text>
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.close, { top: insets.top + spacing.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>

        <View style={styles.iconWrap}>
          <Ionicons name="reader" size={44} color="#fff" />
        </View>

        <Text style={styles.title}>Unlock Telelume</Text>
        <Text style={styles.subtitle}>
          You have used your {FREE_SESSIONS} free sessions. Go unlimited with a plan.
        </Text>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {renderPlan('weekly', 'week', true)}
          {renderPlan('monthly', 'month', false)}
        </View>

        <Pressable
          onPress={onContinue}
          disabled={busy}
          style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Continue</Text>}
        </Pressable>

        <Text style={styles.fine}>
          {priceFor(selected)}/{selected === 'weekly' ? 'week' : 'month'}. Plans auto-renew
          until canceled. Cancel anytime in your Apple ID settings at least 24 hours before the
          period ends. Payment is charged to your Apple ID.
        </Text>

        <Pressable onPress={onRestore} disabled={busy} hitSlop={8} style={styles.restore}>
          <Text style={styles.restoreText}>Restore purchase</Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, alignItems: 'center', flexGrow: 1 },
  close: { position: 'absolute', right: spacing.lg, zIndex: 2, padding: 4 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: spacing.lg },
  perks: { alignSelf: 'stretch', gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perkText: { color: colors.text, fontSize: 15, flex: 1 },
  plans: { alignSelf: 'stretch', gap: spacing.sm, marginBottom: spacing.md },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  planActive: { borderColor: colors.primary, backgroundColor: 'rgba(108,198,255,0.08)' },
  badge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  planSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  planPrice: { color: colors.text, fontSize: 20, fontWeight: '800' },
  planPer: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: spacing.sm,
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  fine: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: spacing.md },
  restore: { marginTop: spacing.lg, padding: spacing.sm },
  restoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  legalLink: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  legalDot: { color: colors.textMuted, fontSize: 13 },
});
