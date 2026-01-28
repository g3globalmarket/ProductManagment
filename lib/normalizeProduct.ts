import { Product } from '@/types/product'

/**
 * Normalizes a product from the database to ensure all required fields exist
 * for UI compatibility. Handles missing imagesFinal and nameMn fields.
 */
export function normalizeProduct(p: any): Product {
  // Extract images from various possible locations
  // Priority: imagesFinal > custom_properties.imageUrls > imagesOriginal
  const imageUrls =
    (Array.isArray(p.imagesFinal) && p.imagesFinal.length > 0)
      ? p.imagesFinal
      : (Array.isArray(p.custom_properties?.imageUrls) && p.custom_properties.imageUrls.length > 0)
      ? p.custom_properties.imageUrls
      : (Array.isArray(p.imagesOriginal) && p.imagesOriginal.length > 0)
      ? p.imagesOriginal
      : []

  // Use title as preferred name, fallback to nameMn, then empty string
  const nameMn = p.nameMn ?? p.title ?? ''

  // Calculate priceMnt if missing or zero
  // Derive from KRW prices if priceMnt is 0 or missing
  const rate = 2.6
  let priceMnt = p.priceMnt
  if (typeof priceMnt === 'number' && priceMnt > 0) {
    // Keep existing priceMnt
  } else {
    const krw = (typeof p.sale_price === 'number' && p.sale_price > 0) 
      ? p.sale_price 
      : (typeof p.regular_price === 'number' && p.regular_price > 0)
      ? p.regular_price
      : 0
    priceMnt = krw > 0 ? Math.round(krw * rate) : 0
  }

  // Map description fields
  const descriptionMn = p.descriptionMn ?? p.detailed_description ?? p.short_description ?? ''

  return {
    ...p,
    imagesFinal: imageUrls,  // Always an array (may be empty)
    nameMn: nameMn,          // Backward compat for UI - auto-filled from title if missing
    title: p.title ?? p.nameMn ?? '',  // Ensure title exists
    descriptionMn: descriptionMn,  // Auto-filled from detailed_description/short_description if missing
    priceMnt: priceMnt,      // Auto-calculated from sale_price/regular_price if missing
    // Ensure arrays are always arrays
    imagesOriginal: Array.isArray(p.imagesOriginal) ? p.imagesOriginal : [],
    // Ensure optional fields have defaults
    nameOriginal: p.nameOriginal ?? '',
    short_description: p.short_description ?? p.descriptionMn ?? '',
    detailed_description: p.detailed_description ?? '',
  } as Product
}

