import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FontFamilyValue } from '@/constants/theme';

export type CameraFacing = 'front' | 'back';

export interface PrompterSettings {
  /** Scroll speed on a 1-100 scale; mapped to px/sec at runtime. */
  speed: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamilyValue;
  textColor: string;
  /** Horizontally flip text for use with a physical beam-splitter rig. */
  mirror: boolean;
  /** Countdown (seconds) before scrolling + recording start. 0 = off. */
  countdown: number;
  /** Horizontal text margin in px. */
  margin: number;
  /** Scrim opacity (0-1) over the camera preview for text legibility. */
  dim: number;
  /** Record video with the camera, or use a plain backdrop (overlay mode). */
  cameraEnabled: boolean;
  cameraFacing: CameraFacing;
  /** Keep a reading guide bar centered on screen. */
  showReadingGuide: boolean;
  hydrated: boolean;
}

interface SettingsActions {
  set: <K extends keyof PrompterSettings>(
    key: K,
    value: PrompterSettings[K],
  ) => void;
  reset: () => void;
  setHydrated: () => void;
}

export const DEFAULT_SETTINGS: Omit<PrompterSettings, 'hydrated'> = {
  speed: 25,
  fontSize: 34,
  lineHeight: 1.4,
  fontFamily: 'System',
  textColor: '#FFFFFF',
  mirror: false,
  countdown: 3,
  margin: 24,
  dim: 0.35,
  cameraEnabled: true,
  cameraFacing: 'front',
  showReadingGuide: true,
};

export const useSettings = create<PrompterSettings & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      set: (key, value) => set({ [key]: value } as Partial<PrompterSettings>),
      reset: () => set({ ...DEFAULT_SETTINGS }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'prompterly.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, reset: _r, setHydrated: _h, hydrated: _hy, ...rest }) =>
        rest,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** Map the 1-100 speed scale to pixels-per-second of scroll. */
export function speedToPxPerSec(speed: number): number {
  // Eased so most of the slider lives in comfortable reading territory.
  // 1 -> ~8 px/s (very slow), 25 -> ~24 px/s (default, easy read),
  // 50 -> ~57 px/s, 100 -> ~180 px/s (fast).
  const min = 8;
  const max = 180;
  const t = Math.min(100, Math.max(1, speed)) / 100;
  const eased = Math.pow(t, 1.6);
  return min + (max - min) * eased;
}
