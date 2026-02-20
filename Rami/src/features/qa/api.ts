import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QAItem } from './types';
import type { Language } from '../prayer/types';
import { getAuthToken } from '../forum/api';

const QA_CACHE_PREFIX = '@rami/qa_cache/';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

function normalizeQAItem(raw: any): QAItem {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    body: raw.body ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    language: raw.language as Language,
  };
}

export async function getQAItems(language?: Language): Promise<QAItem[]> {
  const cacheKey = `${QA_CACHE_PREFIX}${language ?? 'all'}`;
  try {
    const query = language ? `?lang=${encodeURIComponent(language)}` : '';
    const response = await fetchWithAuth(`/qa${query}`);
    if (!response.ok) {
      throw new Error('Failed to fetch items');
    }
    const data = await response.json();
    const items = (data.items || []).map(normalizeQAItem);
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ items, cachedAt: Date.now() }));
    return items;
  } catch (e) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { items: QAItem[] };
        if (Array.isArray(parsed?.items)) return parsed.items;
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
}

const QA_ITEM_CACHE_PREFIX = '@rami/qa_item_cache/';

export async function getQAItem(id: string | number): Promise<QAItem> {
  const cacheKey = `${QA_ITEM_CACHE_PREFIX}${id}`;
  try {
    const response = await fetchWithAuth(`/qa/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch item');
    }
    const data = await response.json();
    const item = normalizeQAItem(data.item);
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ item, cachedAt: Date.now() }));
    return item;
  } catch (e) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { item: QAItem };
        if (parsed?.item) return parsed.item;
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
}

export async function createQAItem(data: {
  title: string;
  body: string;
  tags: string[];
  sources: string[];
  language: Language;
}): Promise<QAItem> {
  const response = await fetchWithAuth('/qa', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create item');
  }

  const payload = await response.json();
  return normalizeQAItem(payload.item);
}

export async function updateQAItem(
  id: string | number,
  data: Partial<{
    title: string;
    body: string;
    tags: string[];
    sources: string[];
    language: Language;
  }>
): Promise<QAItem> {
  const response = await fetchWithAuth(`/qa/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update item');
  }

  const payload = await response.json();
  return normalizeQAItem(payload.item);
}

export async function deleteQAItem(id: string | number): Promise<void> {
  const response = await fetchWithAuth(`/qa/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete item');
  }
}
