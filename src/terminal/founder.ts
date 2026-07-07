import type { LiveLaunch } from "./kickstart";

export function calculateConvictionScore(launches: LiveLaunch[]): number {
  if (launches.length === 0) return 35;

  let score = 45;

  score += Math.min(launches.length * 7, 28);

  const successfulLaunches = launches.filter((l) => l.mcap > 120_000).length;
  const successRate = (successfulLaunches / launches.length) * 100;
  score += Math.min(successRate * 0.35, 22);

  const avgPerformance = launches.reduce((sum, l) => sum + (l.change24h || 0), 0) / launches.length;
  score += Math.max(Math.min(avgPerformance * 0.65, 18), -12);

  const recent = launches.slice(0, 3);
  const recentAvg = recent.reduce((sum, l) => sum + (l.change24h || 0), 0) / recent.length;
  score += recentAvg * 0.7;

  const lockupFactor = launches.reduce((sum, launch) => {
    if (!launch.lockupDays) return sum;
    return sum + Math.min(launch.lockupDays / 30, 1.8);
  }, 0) * 9;

  score += Math.min(lockupFactor, 32);

  const badLaunches = launches.filter((l) => l.mcap < 25_000 && (l.change24h || 0) < -65).length;
  score -= badLaunches * 14;

  return Math.max(12, Math.min(97, Math.round(score)));
}