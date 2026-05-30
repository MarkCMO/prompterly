import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const PRO_ENTITLEMENT = 'pro';

/** react-native-purchases is a native module that is absent in Expo Go. */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const iosKey =
  (Constants.expoConfig?.extra?.revenueCatIosKey as string | undefined) ||
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
  '';
const androidKey =
  (Constants.expoConfig?.extra?.revenueCatAndroidKey as string | undefined) ||
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
  '';

let configured = false;

export function configurePurchases(): void {
  if (configured || isExpoGo) return;
  const apiKey = Platform.OS === 'ios' ? iosKey : androidKey;
  if (!apiKey) return;
  try {
    Purchases.configure({ apiKey });
    configured = true;
  } catch {
    // Native module unavailable (e.g. unsupported runtime) - leave ungated.
  }
}

/** Whether the paywall should actually block access in this runtime. */
export function gateEnforced(): boolean {
  return configured && !isExpoGo;
}

function hasPro(info: CustomerInfo): boolean {
  return !!info.entitlements.active[PRO_ENTITLEMENT];
}

export function usePro(): { isPro: boolean; loading: boolean; gated: boolean } {
  const gated = gateEnforced();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(gated);

  useEffect(() => {
    if (!gated) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const apply = (info: CustomerInfo) => {
      if (mounted) setIsPro(hasPro(info));
    };
    Purchases.getCustomerInfo()
      .then(apply)
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    Purchases.addCustomerInfoUpdateListener(apply);
    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(apply);
    };
  }, [gated]);

  return { isPro, loading, gated };
}

/** The one-time unlock package from the current offering (lifetime, else first available). */
export async function getUnlockPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;
  return (
    current.availablePackages.find((p) => p.packageType === 'LIFETIME') ??
    current.availablePackages[0] ??
    null
  );
}

/** Buys the one-time unlock. Returns true if pro is now active. */
export async function purchasePro(): Promise<boolean> {
  const pkg = await getUnlockPackage();
  if (!pkg) throw new Error('The upgrade is not available right now. Try again shortly.');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasPro(customerInfo);
}

export async function restorePro(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return hasPro(info);
}

/** Best-effort price string for the unlock, e.g. "$2.39". */
export async function getUnlockPriceString(): Promise<string | null> {
  const pkg = await getUnlockPackage();
  return pkg?.product.priceString ?? null;
}
