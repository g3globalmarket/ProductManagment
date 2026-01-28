/**
 * Deterministic PRNG for fake source checking simulation.
 * 
 * HOW IT WORKS:
 * - Uses a simple hash-based approach with day key to ensure:
 *   - Same product + same day = same result (deterministic)
 *   - Results change across days in a stable way (simulates real-world changes)
 *   - No external dependencies, works offline
 * 
 * SIMULATION LOGIC:
 * - 15% chance: product becomes out of stock
 * - 25% chance (if in stock): price changes by ±3% to ±12%
 * - Results are seeded by: productId + store + sourceUrl + dayKey
 *   where dayKey = Math.floor(Date.now() / 86400000) (integer day)
 * 
 * This allows testing the UI with realistic but fake data that:
 * - Persists across page refreshes (same day = same results)
 * - Changes over time (different day = different results)
 * - Is deterministic for demos (same inputs = same outputs)
 */

// Simple string hash function
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Mulberry32 PRNG (fast, simple, deterministic)
class DeterministicPRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate a deterministic seed for a product check
 * @param productId - Product ID
 * @param store - Source store
 * @param sourceUrl - Source URL
 * @param dayKey - Integer day key (Math.floor(Date.now() / 86400000))
 */
export function getProductCheckSeed(
  productId: string,
  store: string,
  sourceUrl: string,
  dayKey: number
): number {
  const seedString = `${productId}-${store}-${sourceUrl}-${dayKey}`
  return hashString(seedString)
}

/**
 * Simulate checking a product's source status
 * Returns deterministic results based on product ID and day
 */
export function simulateSourceCheck(
  productId: string,
  store: string,
  sourceUrl: string,
  baselinePriceKrw: number
): {
  newPriceKrw: number
  outOfStock: boolean
  priceChanged: boolean
} {
  const dayKey = Math.floor(Date.now() / 86400000) // Integer day
  const seed = getProductCheckSeed(productId, store, sourceUrl, dayKey)
  const rng = new DeterministicPRNG(seed)

  // 15% chance: out of stock
  const outOfStock = rng.next() < 0.15

  // 25% chance: price changes (if not out of stock)
  let newPriceKrw = baselinePriceKrw
  let priceChanged = false

  if (!outOfStock && rng.next() < 0.25) {
    // Price change: ±3% to ±12%
    const changePercent = 0.03 + rng.next() * 0.09 // 0.03 to 0.12
    const direction = rng.next() < 0.5 ? -1 : 1
    const delta = baselinePriceKrw * changePercent * direction
    newPriceKrw = Math.max(1, Math.round(baselinePriceKrw + delta))
    priceChanged = true
  }

  return {
    newPriceKrw,
    outOfStock,
    priceChanged: priceChanged || newPriceKrw !== baselinePriceKrw,
  }
}

