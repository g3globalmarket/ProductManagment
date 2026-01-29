import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Product, ProductStatus } from "@/types/product"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get display title for a product.
 * Consistent logic: title (preferred) → nameMn → nameOriginal → slug → empty string
 * This ensures UI always shows the correct name regardless of which field is populated.
 */
export function getDisplayTitle(product: Product | null | undefined): string {
  if (!product) return ""
  return product.title || product.nameMn || product.nameOriginal || product.slug || ""
}

/**
 * Get display description for a product.
 * Consistent logic: detailed_description → descriptionMn → short_description → empty string
 */
export function getDisplayDescription(product: Product | null | undefined): string {
  if (!product) return ""
  return product.detailed_description || product.descriptionMn || product.short_description || ""
}

/**
 * Check if a product matches the lifecycle status tab filter.
 * @param product - The product to check
 * @param tab - The active tab ('ALL' or a specific ProductStatus)
 * @returns true if the product matches the tab filter
 */
export function matchesLifecycleTab(product: Product, tab: 'ALL' | ProductStatus): boolean {
  if (tab === 'ALL') return true
  return product.lifecycleStatus === tab
}
