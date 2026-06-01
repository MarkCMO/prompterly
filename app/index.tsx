import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/constants/theme';
import { deleteScript, duplicateScript, getScripts } from '@/lib/storage';
import type { Script } from '@/lib/types';
import { IconButton } from '@/components/IconButton';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s read`;
  return `${m}m ${s.toString().padStart(2, '0')}s read`;
}

export default function LibraryScreen() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loaded, setLoaded] = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    const list = await getScripts();
    setScripts(list);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDelete = (script: Script) => {
    Alert.alert('Delete script', `Delete "${script.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScript(script.id);
          load();
        },
      },
    ]);
  };

  const onDuplicate = async (script: Script) => {
    await duplicateScript(script.id);
    load();
  };

  const renderItem = ({ item }: { item: Script }) => (
    <View style={styles.card}>
      <Pressable
        style={styles.cardMain}
        onPress={() => router.push(`/teleprompter/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title} in teleprompter`}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardPreview} numberOfLines={2}>
          {item.body.trim() || 'Empty script'}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.cardMetaText}>
            {formatDuration(item.estimatedSeconds)}
          </Text>
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <IconButton
          icon="play"
          variant="solid"
          size={20}
          onPress={() => router.push(`/teleprompter/${item.id}`)}
          label=""
        />
        <IconButton
          icon="create-outline"
          size={20}
          onPress={() => router.push(`/script/${item.id}`)}
          label=""
        />
        <IconButton
          icon="copy-outline"
          size={20}
          onPress={() => onDuplicate(item)}
          label=""
        />
        <IconButton
          icon="trash-outline"
          variant="danger"
          size={20}
          onPress={() => onDelete(item)}
          label=""
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon="settings-outline"
              size={22}
              onPress={() => router.push('/settings')}
              label=""
            />
          ),
        }}
      />
      <FlatList
        data={scripts}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 96,
          gap: spacing.md,
        }}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No scripts yet</Text>
              <Text style={styles.emptyBody}>
                Tap the button below to write your first script, then hit record.
              </Text>
            </View>
          ) : null
        }
      />

      <View
        pointerEvents="box-none"
        style={[styles.fabWrap, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Link href="/script/new" asChild>
          <Pressable
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="New script"
          >
            <Ionicons name="add" size={26} color="#fff" />
            <Text style={styles.fabText}>New script</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardMain: { padding: spacing.md, gap: 6 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardPreview: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { color: colors.textMuted, fontSize: 12 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  empty: { alignItems: 'center', gap: 8, paddingTop: 96, paddingHorizontal: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
