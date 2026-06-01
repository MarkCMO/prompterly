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

export type PlanKey = 'weekly' | 'monthly';

export interface Plan {
  key: PlanKey;
  pkg: PurchasesPackage;
  /** Localized price, e.g. "$4.99". */
  price: string;
  /** Billing period word, e.g. "week" / "month". */
  period: string;
}

/**
 * The two subscription plans from the current offering (weekly + monthly).
 * Prefers RevenueCat package types; falls back to offering order so it still
 * works if the packages are set up as "custom" rather than $rc_weekly/$rc_monthly.
 */
export async function getPlans(): Promise<Plan[]> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  const weekly = current.availablePackages.find((p) => p.packageType === 'WEEKLY');
  const monthly = current.availablePackages.find((p) => p.packageType === 'MONTHLY');

  const plans: Plan[] = [];
  if (weekly) plans.push({ key: 'weekly', pkg: weekly, price: weekly.product.priceString, period: 'week' });
  if (monthly) plans.push({ key: 'monthly', pkg: monthly, price: monthly.product.priceString, period: 'month' });

  if (plans.length === 0) {
    // Fallback: take whatever packages exist, in order (weekly first).
    current.availablePackages.slice(0, 2).forEach((pkg, i) => {
      plans.push({
        key: i === 0 ? 'weekly' : 'monthly',
        pkg,
        price: pkg.product.priceString,
        period: i === 0 ? 'week' : 'month',
      });
    });
  }
  return plans;
}

/** Buys the chosen plan. Returns true if pro is now active. */
export async function purchasePlan(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasPro(customerInfo);
}

export async function restorePro(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return hasPro(info);
}
