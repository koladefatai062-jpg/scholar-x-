export interface BadgeDef {
  id: string
  label: string
  emoji: string
  desc: string
}

export const BADGES: Record<string, BadgeDef> = {
  first_quiz: { id: 'first_quiz', label: 'First Steps', emoji: '🌱', desc: 'Completed your first quiz' },
  perfect_score: { id: 'perfect_score', label: 'Perfect Score', emoji: '💯', desc: 'Scored 100% on a quiz' },
  week_warrior: { id: 'week_warrior', label: 'Week Warrior', emoji: '🔥', desc: 'Reached a 7-day streak' },
  rising_star: { id: 'rising_star', label: 'Rising Star', emoji: '⭐', desc: 'Earned 500 XP' },
  level_five: { id: 'level_five', label: 'Level 5', emoji: '🚀', desc: 'Reached Level 5' },
}

export const badgeInfo = (id: string): BadgeDef => BADGES[id] || { id, label: id, emoji: '🎖️', desc: '' }

export const xpForScore = (score: number) => Math.max(0, Math.floor(score)) * 10

export const levelForXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1

export const xpForLevel = (level: number) => 50 * (level - 1) ** 2

export const levelProgress = (xp: number) => {
  const level = levelForXp(xp)
  const cur = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const pct = next > cur ? Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) : 100
  return { level, current: cur, next, pct }
}
