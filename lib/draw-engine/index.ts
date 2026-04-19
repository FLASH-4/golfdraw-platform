export type DrawMode = 'random' | 'weighted'

/** Generate 5 winning numbers (1-45) */
export function generateWinningNumbers(
  mode: DrawMode,
  scoreFrequency?: Record<number, number>
): number[] {
  if (mode === 'random') {
    const nums = new Set<number>()
    while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1)
    return [...nums]
  }

  // Weighted: bias toward most-frequent user scores
  const pool: number[] = []
  for (let n = 1; n <= 45; n++) {
    const weight = scoreFrequency?.[n] ?? 1
    for (let i = 0; i < weight; i++) pool.push(n)
  }

  const nums = new Set<number>()
  while (nums.size < 5) {
    nums.add(pool[Math.floor(Math.random() * pool.length)] as number)
  }
  return [...nums]
}

/** Count how many numbers a user's entry matches */
export function countMatches(userNums: number[], winningNums: number[]): number {
  return userNums.filter(n => winningNums.includes(n)).length
}

/** Calculate prize pools from total subscription revenue */
export function calculatePools(totalRevenue: number, jackpotCarryOver = 0) {
  return {
    jackpot: totalRevenue * 0.40 + jackpotCarryOver,
    fourMatch: totalRevenue * 0.35,
    threeMatch: totalRevenue * 0.25,
  }
}
