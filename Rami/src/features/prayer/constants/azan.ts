/**
 * Azan sounds hosted on Cloudinary.
 * URL format: https://res.cloudinary.com/dqrmoafsy/video/upload/{version}/{publicId}.mp3
 */
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dqrmoafsy/video/upload';
const DEFAULT_VERSION = 'v1769845759';

/** Public IDs for the 8 azan sounds (order: azan1 .. azan8). Optional version overrides default. */
export const AZAN_SOUNDS = [
  { key: 'azan1', publicId: '168410_xsa053' },
  { key: 'azan2', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A2%D9%A3%D9%A1%D9%A9_ivrvst' },
  { key: 'azan3', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A2%D9%A7%D9%A2%D9%A3_xnpavn' },
  { key: 'azan4', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A1%D9%A9%D9%A2%D9%A1_nun99y' },
  { key: 'azan5', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A0%D9%A7%D9%A4%D9%A8_s6d7vp' },
  { key: 'azan6', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A1%D9%A5%D9%A2%D9%A5_mauoej' },
  { key: 'azan7', publicId: '7K_4c3jkRBo_hqs3la' },
  { key: 'azan8', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A2%D9%A0%D9%A1%D9%A2%D9%A0%D9%A5%D9%A0%D9%A3%D9%A5_iwbs6j', version: 'v1770133685' },
] as const;

export type AzanSoundKey = (typeof AZAN_SOUNDS)[number]['key'];
/** Keys used in settings: 'azan1' | 'azan2' | ... | 'azan8' */
export const AZAN_SOUND_KEYS = AZAN_SOUNDS.map((sound) => sound.key) as readonly AzanSoundKey[];

const SOUND_MAP = Object.fromEntries(
  AZAN_SOUNDS.map((s) => [s.key, { publicId: s.publicId, version: s.version ?? DEFAULT_VERSION }])
) as Record<AzanSoundKey, { publicId: string; version: string }>;

export function getAzanSoundUrl(soundKey: string): string | null {
  const entry = SOUND_MAP[soundKey as AzanSoundKey];
  if (!entry) return null;
  return `${CLOUDINARY_BASE}/${entry.version}/${entry.publicId}.mp3`;
}

export function isAzanSoundKey(key: string): key is (typeof AZAN_SOUND_KEYS)[number] {
  return key in SOUND_MAP;
}
