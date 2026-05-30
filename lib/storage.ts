import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NewScriptInput, Script } from './types';

const SCRIPTS_KEY = 'prompterly.scripts.v1';

// Average speaking pace used to estimate read time when none is recorded yet.
const WORDS_PER_MINUTE = 140;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateSeconds(body: string): number {
  const words = countWords(body);
  return Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60));
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<Script[]> {
  try {
    const raw = await AsyncStorage.getItem(SCRIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Script[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function writeAll(scripts: Script[]): Promise<void> {
  await AsyncStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

export async function getScripts(): Promise<Script[]> {
  const scripts = await readAll();
  return scripts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getScript(id: string): Promise<Script | null> {
  const scripts = await readAll();
  return scripts.find((s) => s.id === id) ?? null;
}

export async function createScript(input: NewScriptInput): Promise<Script> {
  const scripts = await readAll();
  const now = Date.now();
  const script: Script = {
    id: generateId(),
    title: input.title.trim() || 'Untitled script',
    body: input.body,
    createdAt: now,
    updatedAt: now,
    estimatedSeconds: estimateSeconds(input.body),
  };
  scripts.push(script);
  await writeAll(scripts);
  return script;
}

export async function updateScript(
  id: string,
  patch: Partial<NewScriptInput>,
): Promise<Script | null> {
  const scripts = await readAll();
  const idx = scripts.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const existing = scripts[idx];
  const nextBody = patch.body ?? existing.body;
  const updated: Script = {
    ...existing,
    title:
      patch.title !== undefined
        ? patch.title.trim() || 'Untitled script'
        : existing.title,
    body: nextBody,
    estimatedSeconds: estimateSeconds(nextBody),
    updatedAt: Date.now(),
  };
  scripts[idx] = updated;
  await writeAll(scripts);
  return updated;
}

export async function deleteScript(id: string): Promise<void> {
  const scripts = await readAll();
  await writeAll(scripts.filter((s) => s.id !== id));
}

export async function duplicateScript(id: string): Promise<Script | null> {
  const original = await getScript(id);
  if (!original) return null;
  return createScript({
    title: `${original.title} (copy)`,
    body: original.body,
  });
}
