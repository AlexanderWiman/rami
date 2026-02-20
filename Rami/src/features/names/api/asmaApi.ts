/**
 * Fetches Asma ul Husna audio URLs from backend (proxies IslamicAPI).
 * Falls back to direct CDN URLs when backend is not configured.
 */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://adventurous-bravery-production.up.railway.app/api';

export type AsmaApiName = {
  number: number;
  audioUrl: string;
};

const cache = new Map<string, AsmaApiName[]>();

export async function fetchAsmaAudioUrls(language: string): Promise<AsmaApiName[] | null> {
  const cached = cache.get(language);
  if (cached) return cached;

  try {
    const base = API_BASE.replace(/\/$/, '');
    const res = await fetch(`${base}/asma-ul-husna?language=${encodeURIComponent(language)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { names?: { number: number; audioUrl?: string; audio?: string }[] };
    const names = (data.names ?? []).map((n) => ({
      number: n.number,
      audioUrl: n.audioUrl ?? (n.audio?.startsWith('http') ? n.audio : `https://islamicapi.com${n.audio}`),
    }));
    cache.set(language, names);
    return names;
  } catch {
    return null;
  }
}
