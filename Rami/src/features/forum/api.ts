import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Thread, ThreadWithContent, ThreadContent, AuthResponse, Admin } from './types';

// Configure your backend URL here
const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

const AUTH_TOKEN_KEY = '@forum_auth_token';
const ADMIN_DATA_KEY = '@forum_admin_data';

// Token management
export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, ADMIN_DATA_KEY]);
}

export async function getStoredAdmin(): Promise<Admin | null> {
  const data = await AsyncStorage.getItem(ADMIN_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setStoredAdmin(admin: Admin): Promise<void> {
  await AsyncStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(admin));
}

// HTTP helpers
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

// Auth API
export async function login(username: string, password: string): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    throw new Error('Could not reach server. Check your connection and that the backend is running.');
  }

  if (!response.ok) {
    let message = 'Login failed';
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      if (response.status === 429) message = 'Too many attempts. Try again in 15 minutes.';
      else if (response.status >= 500) message = 'Server error. Try again later.';
      else if (response.status === 401) message = 'Invalid username or password.';
    }
    throw new Error(message);
  }

  const data: AuthResponse = await response.json();
  await setAuthToken(data.token);
  await setStoredAdmin(data.admin);
  return data;
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

export async function checkAuth(): Promise<Admin | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchWithAuth('/auth/me');
    if (!response.ok) {
      await clearAuthToken();
      return null;
    }
    const data = await response.json();
    await setStoredAdmin(data.admin);
    return data.admin;
  } catch {
    return await getStoredAdmin();
  }
}

// Threads API – cache for offline fallback
const THREADS_CACHE_PREFIX = '@forum/threads_cache/';
const THREAD_CACHE_PREFIX = '@forum/thread_cache/';

export async function getThreads(options?: { category?: 'community' | 'sources' }): Promise<Thread[]> {
  const cacheKey = `${THREADS_CACHE_PREFIX}${options?.category ?? 'all'}`;
  try {
    const query = options?.category ? `?category=${encodeURIComponent(options.category)}` : '';
    const response = await fetchWithAuth(`/threads${query}`);
    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }
    const data = await response.json();
    const threads = data.threads;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ threads, cachedAt: Date.now() }));
    return threads;
  } catch (e) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { threads: Thread[] };
        if (Array.isArray(parsed?.threads)) return parsed.threads;
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
}

export async function getThread(id: number): Promise<ThreadWithContent> {
  const cacheKey = `${THREAD_CACHE_PREFIX}${id}`;
  try {
    const response = await fetchWithAuth(`/threads/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch thread');
    }
    const thread = await response.json();
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ thread, cachedAt: Date.now() }));
    return thread;
  } catch (e) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { thread: ThreadWithContent };
        if (parsed?.thread) return parsed.thread;
      } catch {
        /* ignore */
      }
    }
    throw e;
  }
}

export async function createThread(
  title: string,
  content: Omit<ThreadContent, 'id'>[],
  pinned = false,
  category: 'community' | 'sources' = 'community'
): Promise<ThreadWithContent> {
  const response = await fetchWithAuth('/threads', {
    method: 'POST',
    body: JSON.stringify({ title, content, pinned, category }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create thread');
  }

  return response.json();
}

export async function updateThread(
  id: number,
  data: { title?: string; content?: Omit<ThreadContent, 'id'>[]; pinned?: boolean }
): Promise<ThreadWithContent> {
  const response = await fetchWithAuth(`/threads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update thread');
  }

  return response.json();
}

export async function updateContentHighlights(
  threadId: number,
  contentId: number,
  highlights: Array<{ start: number; end: number; color: string }>
): Promise<void> {
  const response = await fetchWithAuth(
    `/threads/${threadId}/content/${contentId}/highlights`,
    {
      method: 'PATCH',
      body: JSON.stringify({ highlights }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update highlights');
  }
}

export async function deleteThread(id: number): Promise<void> {
  const response = await fetchWithAuth(`/threads/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete thread');
  }
}

// Upload API
export async function uploadFile(file: { uri: string; name: string; type: string }): Promise<{ url: string }> {
  const token = await getAuthToken();

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  return response.json();
}

export async function uploadImage(imageUri: string): Promise<{ url: string }> {
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  return uploadFile({ uri: imageUri, name: filename, type });
}

// Admin management API (superadmin only)
export async function getAdmins(): Promise<Admin[]> {
  const response = await fetchWithAuth('/admins');
  if (!response.ok) {
    throw new Error('Failed to fetch admins');
  }
  const data = await response.json();
  return data.admins;
}

export async function createAdmin(
  username: string,
  password: string,
  role: 'admin' | 'superadmin' = 'admin'
): Promise<Admin> {
  const response = await fetchWithAuth('/admins', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create admin');
  }

  const data = await response.json();
  return data.admin;
}

export async function deleteAdmin(id: number): Promise<void> {
  const response = await fetchWithAuth(`/admins/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete admin');
  }
}
