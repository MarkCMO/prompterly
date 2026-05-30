import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/constants/theme';
import {
  createScript,
  estimateSeconds,
  getScript,
  updateScript,
} from '@/lib/storage';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(isNew ? null : id ?? null);
  const [loaded, setLoaded] = useState(isNew);
  const dirty = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'New script' : 'Edit script' });
  }, [navigation, isNew]);

  useEffect(() => {
    let active = true;
    if (!isNew && id) {
      getScript(id).then((s) => {
        if (!active || !s) return;
        setTitle(s.title);
        setBody(s.body);
        setLoaded(true);
      });
    }
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const persist = useCallback(async (): Promise<string | null> => {
    if (!dirty.current && currentId) return currentId;
    if (!title.trim() && !body.trim()) return currentId;
    if (currentId) {
      await updateScript(currentId, { title, body });
      dirty.current = false;
      return currentId;
    }
    const created = await createScript({ title, body });
    setCurrentId(created.id);
    dirty.current = false;
    return created.id;
  }, [currentId, title, body]);

  // Save when leaving the screen.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      persist();
    });
    return unsub;
  }, [navigation, persist]);

  const onChange = (fn: (v: string) => void) => (v: string) => {
    dirty.current = true;
    fn(v);
  };

  const onRecord = async () => {
    const savedId = await persist();
    if (savedId) router.replace(`/teleprompter/${savedId}`);
  };

  const seconds = estimateSeconds(body);
  const mins = Math.floor(seconds / 60);
  const readTime =
    mins === 0 ? `${seconds}s` : `${mins}m ${(seconds % 60).toString().padStart(2, '0')}s`;
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={title}
          onChangeText={onChange(setTitle)}
          placeholder="Script title"
          placeholderTextColor={colors.textMuted}
          style={styles.titleInput}
          returnKeyType="next"
        />

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="text-outline" size={13} color={colors.textMuted} />
            <Text style={styles.statText}>{words} words</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.statText}>~{readTime}</Text>
          </View>
        </View>

        <TextInput
          value={body}
          onChangeText={onChange(setBody)}
          placeholder="Paste or write your script here. Keep sentences short and punchy so they're easy to read on camera."
          placeholderTextColor={colors.textMuted}
          style={styles.bodyInput}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={styles.recordBtn}
          onPress={onRecord}
          accessibilityRole="button"
          accessibilityLabel="Open in teleprompter"
        >
          <Ionicons name="videocam" size={20} color="#fff" />
          <Text style={styles.recordText}>Open in teleprompter</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  titleInput: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: { color: colors.textMuted, fontSize: 12 },
  bodyInput: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
    minHeight: 320,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
  },
  recordText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
