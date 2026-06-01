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
import { getUnlockPriceString, purchasePro, restorePro } from '@/lib/purchases';
import { FREE_SESSIONS } from '@/lib/storage';

const PRIVACY_URL = 'https://markcmo.com/prompterly-privacy';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PERKS = [
  'Unlimited teleprompter sessions',
  'Read your script over the live camera',
  'Unlimited saved scripts',
  'Smooth 60fps adjustable scrolling',
  'Mirror mode + custom text colors',
  'Reading guide and countdown timer',
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUnlockPriceString()
      .then(setPrice)
      .catch(() => {});
  }, []);

  const onSuccess = useCallback(() => {
    if (next) router.replace({ pathname: '/teleprompter/[id]', params: { id: next } });
    else router.back();
  }, [next]);

  const onStart = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await purchasePro();
      if (ok) onSuccess();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err?.userCancelled) {
        Alert.alert('Purchase failed', err?.message || 'Could not complete the purchase. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  const onRestore = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await restorePro();
      if (ok) {
        onSuccess();
      } else {
        Alert.alert('Nothing to restore', 'We could not find an active subscription for this account.');
      }
    } catch {
      Alert.alert('Restore failed', 'Could not restore purchases. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  const priceLabel = price ?? '$2.99';

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

        <Text style={styles.title}>Unlock Prompterly</Text>
        <Text style={styles.subtitle}>
          You have used your {FREE_SESSIONS} free sessions. Unlock the full app with a
          one-time purchase, yours forever.
        </Text>

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onStart}
          disabled={busy}
          style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel="Start free trial"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Unlock for {priceLabel}</Text>
          )}
        </Pressable>

        <Text style={styles.fine}>
          One-time purchase. No subscription, no recurring charges. Unlocks the full
          app on this Apple ID forever.
        </Text>

        <Pressable onPress={onRestore} disabled={busy} hitSlop={8} style={styles.restore}>
          <Text style={styles.restoreText}>Restore purchase</Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Terms</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy</Text>
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
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  perks: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perkText: { color: colors.text, fontSize: 15, flex: 1 },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  fine: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  restore: { marginTop: spacing.lg, padding: spacing.sm },
  restoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  legalLink: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  legalDot: { color: colors.textMuted, fontSize: 13 },
});
