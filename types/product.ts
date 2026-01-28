export type Store = "gmarket" | "oliveyoung" | "auction"

export type Category = string

export type ProductStatus = "RAW" | "DRAFT" | "READY" | "PUSHED"
export type StorefrontStatus = "Active" | "Pending" | "Draft"

export type Visibility = "public" | "hidden"

export interface Product {
  id: string
  slug?: string          // Product slug (from DB)
  sourceStore: Store
  category: Category
  sourceUrl: string
  nameOriginal?: string  // Optional for DB products
  nameMn?: string        // Optional, legacy - use title for new products
  title?: string         // Preferred Mongolian title (from DB)
  brand?: string
  priceKrw?: number      // Optional for DB products
  priceMnt?: number
  descriptionOriginal?: string  // Optional for DB products
  descriptionMn?: string        // Optional, legacy - use short_description/detailed_description
  short_description?: string     // Preferred Mongolian short description
  detailed_description?: string  // Preferred Mongolian detailed description
  imagesOriginal?: string[]      // Optional
  imagesFinal?: string[]         // Optional - may come from custom_properties.imageUrls
  lifecycleStatus: ProductStatus  // Import tool lifecycle: RAW → DRAFT → READY → PUSHED
  createdAt: string
  // Visibility control
  visibility: Visibility
  // Storefront status (optional, managed by ecommerce app)
  status?: StorefrontStatus  // "Active" | "Pending" | "Draft" - DO NOT modify from import tool
  // Custom properties (may include imageUrls, etc.)
  custom_properties?: any
  // Source change detection fields
  sourceBaselinePriceKrw?: number
  sourceLastCheckedPriceKrw?: number
  sourceLastCheckedInStock?: boolean
  sourceLastCheckedAt?: string
  sourcePriceChanged?: boolean
  sourceOutOfStock?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: {
    field: string
    message: string
  }[]
}

export interface DraftChanges {
  nameMn?: string
  descriptionMn?: string
  brand?: string
  priceMnt?: number
  imagesFinal?: string[]
}

export const STORE_CATEGORIES: Record<Store, Category[]> = {
  gmarket: ["Skincare", "Makeup", "Haircare", "Fragrance", "Health"],
  oliveyoung: ["Skincare", "Makeup", "Haircare", "Body Care", "Men's Care"],
  auction: ["Electronics", "Fashion", "Home", "Beauty", "Sports"],
}

