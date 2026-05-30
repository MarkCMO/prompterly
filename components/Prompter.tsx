import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
  scrollTo,
} from 'react-native-reanimated';
import type { FontFamilyValue } from '@/constants/theme';
import { speedToPxPerSec } from '@/lib/settings';

export interface PrompterHandle {
  reset: () => void;
  jumpToStart: () => void;
}

interface Props {
  body: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamilyValue;
  textColor: string;
  margin: number;
  speed: number;
  playing: boolean;
  mirror: boolean;
  /** Fraction (0-1) from top where the reading guide sits. */
  guideRatio?: number;
  onReachEnd?: () => void;
}

export const Prompter = forwardRef<PrompterHandle, Props>(function Prompter(
  {
    body,
    fontSize,
    lineHeight,
    fontFamily,
    textColor,
    margin,
    speed,
    playing,
    mirror,
    guideRatio = 0.36,
    onReachEnd,
  },
  ref,
) {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const reachedEnd = useSharedValue(false);

  const maxScroll = Math.max(0, contentHeight - containerHeight);

  useImperativeHandle(ref, () => ({
    reset: () => {
      offset.value = 0;
      reachedEnd.value = false;
      scrollTo(animatedRef, 0, 0, false);
    },
    jumpToStart: () => {
      offset.value = 0;
      reachedEnd.value = false;
      scrollTo(animatedRef, 0, 0, true);
    },
  }));

  const pxPerSec = useMemo(() => speedToPxPerSec(speed), [speed]);

  useFrameCallback((frame) => {
    'worklet';
    if (!playing || maxScroll <= 0) return;
    const dtMs = frame.timeSincePreviousFrame ?? 16;
    const delta = (pxPerSec * dtMs) / 1000;
    let next = offset.value + delta;
    if (next >= maxScroll) {
      next = maxScroll;
      if (!reachedEnd.value) {
        reachedEnd.value = true;
        if (onReachEnd) runOnJS(onReachEnd)();
      }
    }
    offset.value = next;
    scrollTo(animatedRef, 0, next, false);
  }, true);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  };

  // Lead/trail padding so the first line starts at the guide and the last
  // line can scroll up to it.
  const padTop = containerHeight * guideRatio;
  const padBottom = containerHeight * (1 - guideRatio);

  return (
    <View style={styles.fill} onLayout={onContainerLayout}>
      <Animated.ScrollView
        ref={animatedRef}
        scrollEnabled={!playing}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        contentContainerStyle={{
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingHorizontal: margin,
        }}
        style={[styles.fill, mirror && styles.mirrored]}
      >
        <Text
          selectable={false}
          style={{
            color: textColor,
            fontSize,
            lineHeight: fontSize * lineHeight,
            fontFamily: fontFamily === 'System' ? undefined : fontFamily,
            fontWeight: '700',
            textAlign: 'left',
          }}
        >
          {body || 'Your script will appear here.'}
        </Text>
      </Animated.ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%' },
  mirrored: { transform: [{ scaleX: -1 }] },
});
