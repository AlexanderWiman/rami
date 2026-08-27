/**
 * Frågespelets minne mellan omgångar: bästa resultat, antal spelade omgångar
 * och totalt antal rätta svar. Allt frivilligt — ett tomt minne är ett giltigt
 * tillstånd och spelet fungerar utan det.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STATS = '@rami/quiz_stats';

export type QuizStats = {
  /** Högsta antal rätt i en omgång. */
  bestScore: number;
  /** Antal frågor i omgången som gav bestScore — resultat jämförs som andel. */
  bestOutOf: number;
  roundsPlayed: number;
  totalCorrect: number;
};

export const EMPTY_STATS: QuizStats = {
  bestScore: 0,
  bestOutOf: 0,
  roundsPlayed: 0,
  totalCorrect: 0,
};

function toFiniteInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export async function loadQuizStats(): Promise<QuizStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATS);
    if (!raw) return EMPTY_STATS;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return EMPTY_STATS;
    const p = parsed as Record<string, unknown>;
    return {
      bestScore: toFiniteInt(p.bestScore),
      bestOutOf: toFiniteInt(p.bestOutOf),
      roundsPlayed: toFiniteInt(p.roundsPlayed),
      totalCorrect: toFiniteInt(p.totalCorrect),
    };
  } catch {
    return EMPTY_STATS;
  }
}

/**
 * Räknar in en avslutad omgång. Returnerar det uppdaterade minnet och om
 * omgången slog det gamla rekordet, så skärmen kan fira det.
 */
export async function recordQuizRound(
  score: number,
  outOf: number
): Promise<{ stats: QuizStats; isNewBest: boolean }> {
  const prev = await loadQuizStats();
  // Andel, så att en omgång med fler frågor inte automatiskt vinner.
  const prevShare = prev.bestOutOf > 0 ? prev.bestScore / prev.bestOutOf : -1;
  const share = outOf > 0 ? score / outOf : 0;
  const isNewBest = share > prevShare;
  const stats: QuizStats = {
    bestScore: isNewBest ? score : prev.bestScore,
    bestOutOf: isNewBest ? outOf : prev.bestOutOf,
    roundsPlayed: prev.roundsPlayed + 1,
    totalCorrect: prev.totalCorrect + score,
  };
  try {
    await AsyncStorage.setItem(KEY_STATS, JSON.stringify(stats));
  } catch {
    // Ett misslyckat sparande får inte stoppa resultatskärmen.
  }
  return { stats, isNewBest };
}
