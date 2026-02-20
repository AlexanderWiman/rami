/**
 * UX 2.0: Orb glow color by time of day — warm gold (morning), emerald (day), teal (evening), moonlight (night).
 */
export type OrbGlowPeriod = 'morning' | 'day' | 'evening' | 'night';

export function getOrbGlowPeriod(hour: number): OrbGlowPeriod {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/** RGBA string for glow; works in light and dark. */
export function getOrbGlowColor(period: OrbGlowPeriod, dark: boolean): string {
  if (dark) {
    switch (period) {
      case 'morning': return 'rgba(200, 178, 125, 0.5)';   // warm gold
      case 'day':     return 'rgba(31, 111, 84, 0.5)';    // emerald
      case 'evening': return 'rgba(0, 128, 128, 0.45)';    // deep teal
      case 'night':  return 'rgba(180, 200, 220, 0.4)';   // soft moonlight blue
      default:       return 'rgba(31, 111, 84, 0.5)';
    }
  }
  switch (period) {
    case 'morning': return 'rgba(200, 178, 125, 0.45)';
    case 'day':     return 'rgba(31, 111, 84, 0.4)';
    case 'evening': return 'rgba(0, 110, 110, 0.4)';
    case 'night':   return 'rgba(160, 180, 210, 0.35)';
    default:        return 'rgba(31, 111, 84, 0.4)';
  }
}
