import { Product, Store, Category, STORE_CATEGORIES } from "@/types/product"

// Deterministic seed-based random number generator
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

const FAKE_BRANDS = [
  "Laneige",
  "Innisfree",
  "The Face Shop",
  "Etude House",
  "Missha",
  "Nature Republic",
  "Tony Moly",
  "COSRX",
  "Dr. Jart+",
  "Sulwhasoo",
]

const FAKE_MONGOLIAN_NAMES = [
  "Арьс арчигч тос",
  "Нүүрний маск",
  "Чийрэгч крем",
  "Хамгаалах тос",
  "Гоо сайхны бүтээгдэхүүн",
  "Чийрэгч гель",
  "Нүүрний тос",
  "Арьсны эм",
  "Гоо сайхны маск",
  "Хамгаалах крем",
]

const FAKE_MONGOLIAN_DESCRIPTIONS = [
  "Өндөр чанартай гоо сайхны бүтээгдэхүүн. Арьсыг чийгшүүлж, гэрэлтүүлнэ.",
  "Байгалийн найрлагатай. Арьсыг эрүүл, гэрэлтэй болгодог.",
  "Өдөр бүр хэрэглэхэд тохиромжтой. Арьсыг хамгаалж, чийгшүүлнэ.",
  "Туршлагатай мэргэжилтнүүдийн зөвлөмж. Арьсыг сайжруулна.",
  "Олон улсын стандартын дагуу үйлдвэрлэгдсэн. Найдвартай чанар.",
]

const FAKE_ORIGINAL_NAMES = [
  "Hydrating Face Cream",
  "Brightening Serum",
  "Anti-Aging Night Mask",
  "Sunscreen SPF 50+",
  "Cleansing Foam",
  "Toner Essence",
  "Eye Cream",
  "Sheet Mask Pack",
  "Moisturizing Lotion",
  "Vitamin C Serum",
]

const FAKE_ORIGINAL_DESCRIPTIONS = [
  "Deeply hydrates and nourishes your skin. Perfect for daily use.",
  "Brightens skin tone and reduces dark spots. Contains natural ingredients.",
  "Advanced anti-aging formula. Use at night for best results.",
  "High protection sunscreen. Water-resistant and non-greasy.",
  "Gentle cleansing foam that removes impurities without stripping moisture.",
]

const IMAGE_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
  "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400",
  "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400",
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
]

function generateProductId(store: Store, category: Category, index: number): string {
  return `${store}-${category.toLowerCase().replace(/\s+/g, "-")}-${index}`
}

function pickRandom<T>(arr: T[], rng: SeededRandom): T {
  return arr[Math.floor(rng.next() * arr.length)]
}

function pickRandomMultiple<T>(arr: T[], count: number, rng: SeededRandom): T[] {
  const shuffled = [...arr].sort(() => rng.next() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

export function generateFakeProducts(
  store: Store,
  category: Category,
  count: number
): Product[] {
  const products: Product[] = []
  const baseSeed = store.charCodeAt(0) * 1000 + category.charCodeAt(0) * 100

  for (let i = 0; i < count; i++) {
    const seed = baseSeed + i
    const rng = new SeededRandom(seed)

    const id = generateProductId(store, category, i)
    const nameOriginal = pickRandom(FAKE_ORIGINAL_NAMES, rng)
    const nameMn = pickRandom(FAKE_MONGOLIAN_NAMES, rng) + ` ${i + 1}`
    
    // Introduce imperfections: 20% missing brand, 15% missing descriptionMn, 10% missing images
    const hasBrand = rng.next() > 0.2
    const hasDescriptionMn = rng.next() > 0.15
    const hasImages = rng.next() > 0.1

    const priceKrw = Math.floor(10000 + rng.next() * 90000)
    const priceMnt = Math.floor(priceKrw * 3.5) // Approximate KRW to MNT conversion

    const imageCount = hasImages ? (rng.next() > 0.5 ? 3 : 2) : 0
    const imagesOriginal = hasImages
      ? pickRandomMultiple(IMAGE_PLACEHOLDERS, imageCount, rng)
      : []
    const imagesFinal = [...imagesOriginal]

    const product: Product = {
      id,
      sourceStore: store,
      category,
      sourceUrl: `https://${store}.com/product/${id}`,
      nameOriginal,
      nameMn: hasDescriptionMn ? nameMn : "", // Sometimes empty to test validation
      brand: hasBrand ? pickRandom(FAKE_BRANDS, rng) : undefined,
      priceKrw,
      priceMnt,
      descriptionOriginal: pickRandom(FAKE_ORIGINAL_DESCRIPTIONS, rng),
      descriptionMn: hasDescriptionMn
        ? pickRandom(FAKE_MONGOLIAN_DESCRIPTIONS, rng)
        : "",
      imagesOriginal,
      imagesFinal,
      lifecycleStatus: "RAW",
      createdAt: new Date(Date.now() - Math.floor(rng.next() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
      visibility: "public",
      // Do not set status (storefront field) - leave to ecommerce app
    }

    products.push(product)
  }

  return products
}

