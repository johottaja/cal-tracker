/** ECB reference rate via Frankfurter (https://www.frankfurter.app/). */
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let cached: { rate: number; fetchedAt: number } | null = null;

export async function getUsdToEurRate(now = Date.now()): Promise<number> {
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }
  const response = await fetch(FRANKFURTER_URL);
  if (!response.ok) {
    throw new Error('Could not load EUR exchange rate');
  }
  const payload = (await response.json()) as { rates?: { EUR?: unknown } };
  const rate = payload.rates?.EUR;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Invalid EUR exchange rate');
  }
  cached = { rate, fetchedAt: now };
  return rate;
}

export function usdMicrosToEur(microsUsd: number, usdToEur: number): number {
  return (microsUsd / 1_000_000) * usdToEur;
}
