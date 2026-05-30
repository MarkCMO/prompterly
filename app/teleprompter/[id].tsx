import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/constants/theme';
import {
  getScript,
  getSessionsUsed,
  incrementSessionsUsed,
  FREE_SESSIONS,
} from '@/lib/storage';
import type { Script } from '@/lib/types';
import { useSettings } from '@/lib/settings';
import { usePro } from '@/lib/purchases';
import { Prompter, type PrompterHandle } from '@/components/Prompter';
import { ReadingGuide } from '@/components/ReadingGuide';
import { IconButton } from '@/components/IconButton';

const GUIDE_RATIO = 0.36;

function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function Stepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value: number | string;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={onDown}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Lower ${label}`}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={onUp}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Raise ${label}`}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function TransportButton({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.transportBtn, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={26} color={colors.text} />
      <Text style={styles.transportLabel}>{label}</Text>
    </Pressable>
  );
}

export default function TeleprompterScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const { isPro, gated } = usePro();

  const [script, setScript] = useState<Script | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [recSeconds, setRecSeconds] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const prompterRef = useRef<PrompterHandle>(null);
  const stopRequested = useRef(false);
  const sessionCounted = useRef(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [mediaPerm, requestMediaPerm] = MediaLibrary.usePermissions();

  useEffect(() => {
    if (id) getScript(id).then(setScript);
  }, [id]);

  // Recording elapsed timer.
  useEffect(() => {
    if (!recording) {
      setRecSeconds(0);
      return;
    }
    const t = setInterval(() => setRecSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    if (!s.cameraEnabled) return true;
    const cam = camPerm?.granted ? camPerm : await requestCamPerm();
    if (!cam?.granted) return false;
    const mic = micPerm?.granted ? micPerm : await requestMicPerm();
    if (!mic?.granted) return false;
    if (!mediaPerm?.granted) await requestMediaPerm();
    return true;
  }, [
    s.cameraEnabled,
    camPerm,
    micPerm,
    mediaPerm,
    requestCamPerm,
    requestMicPerm,
    requestMediaPerm,
  ]);

  // Free-session gate: allow FREE_SESSIONS uses, then require the one-time unlock.
  // One teleprompter open counts as at most one session. Unlimited once unlocked,
  // and a no-op when purchases aren't enforced (Expo Go / unconfigured build).
  const consumeSession = useCallback(async (): Promise<boolean> => {
    if (!gated || isPro || sessionCounted.current) return true;
    const used = await getSessionsUsed();
    if (used >= FREE_SESSIONS) {
      router.replace({ pathname: '/paywall', params: { next: id } });
      return false;
    }
    await incrementSessionsUsed();
    sessionCounted.current = true;
    return true;
  }, [gated, isPro, id]);

  const runCountdown = useCallback(async (from: number) => {
    for (let n = from; n >= 1; n--) {
      setCountdown(n);
      Haptics.selectionAsync().catch(() => {});
      await delay(1000);
    }
    setCountdown(null);
  }, []);

  const saveVideo = useCallback(
    async (uri: string) => {
      try {
        if (!mediaPerm?.granted) {
          const p = await requestMediaPerm();
          if (!p.granted) {
            Alert.alert('Saved locally', 'Grant photo access to save to your camera roll.');
            return;
          }
        }
        await MediaLibrary.saveToLibraryAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('Saved', 'Your recording is in your camera roll.');
      } catch {
        Alert.alert('Save failed', 'Could not save the recording to your library.');
      }
    },
    [mediaPerm, requestMediaPerm],
  );

  // Practice scroll only (no recording).
  const togglePlay = async () => {
    if (!playing && !(await consumeSession())) return;
    setControlsVisible(true);
    setPlaying((p) => !p);
  };

  const restart = () => {
    prompterRef.current?.reset();
    setPlaying(false);
  };

  const startRecording = useCallback(async () => {
    if (!(await consumeSession())) return;
    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert(
        'Permissions needed',
        'Camera and microphone access are required to record. You can still practice with the camera off in Settings.',
      );
      return;
    }
    if (!cameraReady) {
      Alert.alert('One moment', 'The camera is still starting up. Try again in a second.');
      return;
    }
    prompterRef.current?.reset();
    stopRequested.current = false;
    if (s.countdown > 0) await runCountdown(s.countdown);
    if (stopRequested.current) return;

    // Let CameraX finish binding the video use-case before we start the
    // recorder. On some Android devices recordAsync() throws immediately if
    // it's called the instant the preview becomes ready.
    await delay(350);
    if (stopRequested.current) return;

    setRecording(true);
    setPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const video = await cameraRef.current?.recordAsync();
      if (video?.uri) {
        await saveVideo(video.uri);
      }
    } catch (e) {
      const err = e as { message?: string; code?: string; name?: string };
      const detail = [err?.name, err?.code, err?.message]
        .filter(Boolean)
        .join(' / ');
      let dump = '';
      try {
        dump = JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}));
      } catch {
        dump = String(e);
      }
      console.error('[Prompterly] recordAsync failed:', detail, dump);
      Alert.alert(
        'Recording error',
        detail
          ? `Recording failed: ${detail}`
          : `Recording failed with no error detail.\n\n${dump || String(e)}`,
      );
    } finally {
      setRecording(false);
      setPlaying(false);
    }
  }, [cameraReady, consumeSession, ensurePermissions, runCountdown, s.countdown, saveVideo]);

  const stopRecording = useCallback(() => {
    stopRequested.current = true;
    setPlaying(false);
    cameraRef.current?.stopRecording();
    setCountdown(null);
  }, []);

  const onRecordPress = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const onReachEnd = useCallback(() => {
    setPlaying(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);

  const cyclePresetColor = () => {
    const presets = ['#FFFFFF', '#FFE66D', '#7CF5A0', '#6CC6FF', '#FF9F6C'];
    const idx = presets.indexOf(s.textColor);
    s.set('textColor', presets[(idx + 1) % presets.length]);
  };

  const adjustFont = (delta: number) =>
    s.set('fontSize', Math.min(80, Math.max(18, s.fontSize + delta)));
  const adjustSpeed = (delta: number) =>
    s.set('speed', Math.min(100, Math.max(1, s.speed + delta)));

  if (!script) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const needsCamPermissionUI =
    s.cameraEnabled && (!camPerm?.granted || !micPerm?.granted);

  return (
    <View style={styles.root}>
      {/* Camera or plain backdrop */}
      {s.cameraEnabled && camPerm?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={s.cameraFacing}
          mode="video"
          onCameraReady={() => setCameraReady(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}

      {/* Dim scrim for legibility */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${s.dim})` }]}
      />

      {/* Prompter text (tap toggles controls) */}
      <Pressable
        style={styles.prompterArea}
        onPress={() => setControlsVisible((v) => !v)}
      >
        <Prompter
          ref={prompterRef}
          body={script.body}
          fontSize={s.fontSize}
          lineHeight={s.lineHeight}
          fontFamily={s.fontFamily}
          textColor={s.textColor}
          margin={s.margin}
          speed={s.speed}
          playing={playing}
          mirror={s.mirror}
          guideRatio={GUIDE_RATIO}
          onReachEnd={onReachEnd}
        />
      </Pressable>

      <ReadingGuide ratio={GUIDE_RATIO} visible={s.showReadingGuide} />

      {/* Countdown overlay */}
      {countdown !== null && (
        <View pointerEvents="none" style={styles.countdownWrap}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {/* Permission prompt */}
      {needsCamPermissionUI && (
        <View style={styles.permWrap}>
          <Ionicons name="videocam-outline" size={40} color={colors.text} />
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permBody}>
            Allow camera and microphone to record yourself, or turn the camera off
            in Settings to practice.
          </Text>
          <Pressable style={styles.permBtn} onPress={ensurePermissions}>
            <Text style={styles.permBtnText}>Grant access</Text>
          </Pressable>
        </View>
      )}

      {/* TOP BAR */}
      {controlsVisible && (
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton
            icon="close"
            onPress={() => {
              if (recording) stopRecording();
              router.back();
            }}
            label=""
          />
          {recording ? (
            <View style={styles.recPill}>
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{fmtClock(recSeconds)}</Text>
            </View>
          ) : (
            <Text style={styles.topTitle} numberOfLines={1}>
              {script.title}
            </Text>
          )}
          <View style={styles.topRight}>
            <IconButton
              icon="color-palette-outline"
              onPress={cyclePresetColor}
              label=""
              size={22}
            />
            <IconButton
              icon={s.mirror ? 'swap-horizontal' : 'swap-horizontal-outline'}
              active={s.mirror}
              onPress={() => s.set('mirror', !s.mirror)}
              label=""
              size={22}
            />
            <IconButton
              icon="settings-outline"
              onPress={() => router.push('/settings')}
              label=""
              size={22}
            />
          </View>
        </View>
      )}

      {/* BOTTOM CONTROLS */}
      {controlsVisible && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Speed + font steppers */}
          <View style={styles.steppersRow}>
            <Stepper
              label="Speed"
              value={s.speed}
              onDown={() => adjustSpeed(-5)}
              onUp={() => adjustSpeed(5)}
            />
            <Stepper
              label="Font"
              value={s.fontSize}
              onDown={() => adjustFont(-2)}
              onUp={() => adjustFont(2)}
            />
          </View>

          {/* Transport: Restart - Record/Stop - Scroll/Pause */}
          <View style={styles.transport}>
            <TransportButton
              icon="refresh"
              label="Restart"
              onPress={restart}
              accessibilityLabel="Restart from the top"
            />

            {s.cameraEnabled ? (
              <Pressable
                onPress={onRecordPress}
                style={({ pressed }) => [styles.recordOuter, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
              >
                <View
                  style={[
                    styles.recordInner,
                    recording ? styles.recordInnerStop : styles.recordInnerIdle,
                  ]}
                />
              </Pressable>
            ) : (
              <Pressable
                onPress={togglePlay}
                style={({ pressed }) => [
                  styles.recordOuter,
                  styles.playOuter,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={playing ? 'Pause' : 'Play'}
              >
                <Ionicons name={playing ? 'pause' : 'play'} size={34} color="#fff" />
              </Pressable>
            )}

            {s.cameraEnabled ? (
              <TransportButton
                icon={playing ? 'pause' : 'play'}
                label={playing ? 'Pause' : 'Scroll'}
                onPress={togglePlay}
                accessibilityLabel={playing ? 'Pause scrolling' : 'Start scrolling'}
              />
            ) : (
              <TransportButton
                icon="camera-reverse-outline"
                label="Flip"
                onPress={() =>
                  s.set('cameraFacing', s.cameraFacing === 'front' ? 'back' : 'front')
                }
                accessibilityLabel="Flip camera"
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  prompterArea: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recTime: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  steppersRow: { flexDirection: 'row', gap: spacing.md },
  stepper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepperLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
  },
  pressed: { opacity: 0.6 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    minWidth: 88,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  transportLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  recordOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOuter: { backgroundColor: colors.primary, borderColor: 'rgba(255,255,255,0.6)' },
  recordInner: {},
  recordInnerIdle: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger },
  recordInnerStop: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.danger },
  countdownWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  countdownText: {
    color: '#fff',
    fontSize: 120,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 16,
  },
  permWrap: {
    position: 'absolute',
    top: '30%',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  permBody: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },
});
