import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Product, ProductStatus, DraftChanges, ValidationResult, Visibility } from "@/types/product"
import { generateFakeProducts } from "./fake-data"
import { Store, Category } from "@/types/product"
import { simulateSourceCheck } from "./deterministic-prng"
import { apiClient } from "./api-client"

const USE_API = process.env.NEXT_PUBLIC_USE_API === "true"

interface ProductStore {
  products: Product[]
  currentSearchResults: Product[]
  searchParams: {
    store: Store | null
    category: Category | null
    count: number
  } | null
  isLoading: boolean
  isInitialized: boolean
  hasHydrated: boolean

  // Actions
  loadProducts: () => Promise<void>
  searchProducts: (store: Store, category: Category, count: number) => Promise<void>
  updateProduct: (id: string, changes: DraftChanges) => Promise<void>
  updateProductStatus: (id: string, status: ProductStatus) => Promise<void>
  updateMultipleProductsStatus: (ids: string[], status: ProductStatus) => Promise<void>
  getProduct: (id: string) => Product | undefined
  validateProduct: (product: Product) => ValidationResult
  toggleVisibility: (id: string) => Promise<void>
  runSourceCheckForPushedProducts: () => Promise<{ checked: number; priceChanged: number; outOfStock: number }>
  setHasHydrated: (value: boolean) => void
}

const STORAGE_KEY = "product-import-store-v2"

// Migration: Add missing fields to existing products
function migrateProduct(product: any): Product {
  // Migrate old 'status' field to 'lifecycleStatus' if present
  const lifecycleStatus = product.lifecycleStatus ?? product.status ?? "RAW"
  
  return {
    ...product,
    lifecycleStatus,
    // Remove old status field if it was the lifecycle status (keep storefront status if different)
    // Only remove if it matches lifecycle values, otherwise preserve as storefront status
    ...(product.status && ['RAW', 'DRAFT', 'READY', 'PUSHED'].includes(product.status) && product.lifecycleStatus
      ? {} // lifecycleStatus already set, remove old status
      : {}), // Keep status if it's a storefront value
    visibility: product.visibility || "public",
    sourceBaselinePriceKrw: product.sourceBaselinePriceKrw ?? product.priceKrw,
    sourceLastCheckedPriceKrw: product.sourceLastCheckedPriceKrw ?? product.priceKrw,
    sourceLastCheckedInStock: product.sourceLastCheckedInStock ?? true,
    sourceLastCheckedAt: product.sourceLastCheckedAt,
    sourcePriceChanged: product.sourcePriceChanged ?? false,
    sourceOutOfStock: product.sourceOutOfStock ?? false,
  }
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      currentSearchResults: [],
      searchParams: null,
      isLoading: false,
      isInitialized: false,
      hasHydrated: false,

      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value })
      },

      loadProducts: async () => {
        if (!USE_API || get().isInitialized) return
        
        set({ isLoading: true })
        try {
          const products = await apiClient.getProducts()
          set({ products, isLoading: false, isInitialized: true })
        } catch (error) {
          console.error('Failed to load products from API:', error)
          set({ isLoading: false, isInitialized: true })
        }
      },

      searchProducts: async (store: Store, category: Category, count: number) => {
        if (USE_API) {
          // In API mode, generate fake products and save them to DB
          set({ isLoading: true })
          try {
            await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))
            
            // Generate fake products
            const fakeProducts = generateFakeProducts(store, category, count)
            
            // Save to DB via import endpoint
            const res = await fetch('/api/products/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ store, category, count }),
            })
            
            if (!res.ok) {
              throw new Error(`Failed to import products: ${res.statusText}`)
            }
            
            const result = await res.json()
            
            // Reload products from DB to get the actual created products with IDs
            const products = await apiClient.getProducts()
            
            // Find the newly created products (they should match the search params)
            const newProducts = products.filter((p) => 
              p.sourceStore === store && 
              p.category === category &&
              !get().products.find((existing) => existing.id === p.id)
            )
            
            set({
              products: [...get().products, ...newProducts],
              currentSearchResults: newProducts,
              searchParams: { store, category, count },
              isLoading: false,
            })
          } catch (error) {
            console.error('Failed to search products:', error)
            set({ isLoading: false })
            throw error
          }
          return
        }
        
        // Original localStorage mode
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))

        const fakeProducts = generateFakeProducts(store, category, count)
        
        set((state) => {
          // Merge with existing products (don't duplicate if already exists)
          const existingIds = new Set(state.products.map((p) => p.id))
          const newProducts = fakeProducts.filter((p) => !existingIds.has(p.id))
          const updatedProducts = [...state.products, ...newProducts]

          return {
            products: updatedProducts,
            currentSearchResults: fakeProducts,
            searchParams: { store, category, count },
          }
        })
      },

      updateProduct: async (id: string, changes: DraftChanges) => {
        if (USE_API) {
          set({ isLoading: true })
          try {
            // Sync nameMn ↔ title and descriptionMn ↔ detailed_description
            // This ensures DB products with title but no nameMn get synced correctly
            const syncChanges: any = { ...changes }
            if (changes.nameMn !== undefined) {
              // When nameMn is updated, also update title (DB prefers title)
              syncChanges.title = changes.nameMn
            }
            if (changes.descriptionMn !== undefined) {
              // When descriptionMn is updated, also update detailed_description (DB prefers detailed_description)
              syncChanges.detailed_description = changes.descriptionMn
            }
            
            const updated = await apiClient.updateProduct(id, syncChanges)
            set((state) => ({
              products: state.products.map((p) => (p.id === id ? updated : p)),
              currentSearchResults: state.currentSearchResults.map((p) =>
                p.id === id ? updated : p
              ),
              isLoading: false,
            }))
          } catch (error) {
            console.error('Failed to update product:', error)
            set({ isLoading: false })
            throw error
          }
          return
        }

        // Original localStorage mode
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...changes } : p
          ),
          currentSearchResults: state.currentSearchResults.map((p) =>
            p.id === id ? { ...p, ...changes } : p
          ),
        }))
      },

      updateProductStatus: async (id: string, lifecycleStatus: ProductStatus) => {
        if (USE_API) {
          set({ isLoading: true })
          try {
            // CRITICAL FIX: Read product BEFORE update to get pre-mutation price
            // This ensures baseline is set from the original price, not a potentially mutated one
            const currentProduct = get().products.find((p) => p.id === id) || 
                                  get().currentSearchResults.find((p) => p.id === id)
            
            const updated = await apiClient.updateProductStatus(id, lifecycleStatus)
            
            // When pushing, initialize baseline and source check fields
            // Use pre-update priceKrw if available, otherwise use updated priceKrw
            const now = new Date().toISOString()
            const baselinePriceKrw = currentProduct?.priceKrw ?? updated.priceKrw ?? 0
            const finalUpdated = lifecycleStatus === "PUSHED" && 
                                 (currentProduct?.lifecycleStatus !== "PUSHED" || !currentProduct?.sourceBaselinePriceKrw)
              ? {
                  ...updated,
                  sourceBaselinePriceKrw: baselinePriceKrw,
                  sourceLastCheckedPriceKrw: baselinePriceKrw,
                  sourceLastCheckedInStock: true,
                  sourceLastCheckedAt: now,
                  sourcePriceChanged: false,
                  sourceOutOfStock: false,
                }
              : updated

            set((state) => ({
              products: state.products.map((p) => (p.id === id ? finalUpdated : p)),
              currentSearchResults: state.currentSearchResults.map((p) =>
                p.id === id ? finalUpdated : p
              ),
              isLoading: false,
            }))
          } catch (error) {
            console.error('Failed to update product lifecycleStatus:', error)
            set({ isLoading: false })
            throw error
          }
          return
        }

        // Original localStorage mode
        set((state) => {
          const now = new Date().toISOString()
          return {
            products: state.products.map((p) => {
              if (p.id !== id) return p
              
              // CRITICAL FIX: Use current priceKrw BEFORE status change for baseline
              // This ensures baseline is from the original price, not a mutated one
              const baselinePriceKrw = p.priceKrw ?? 0
              
              // When pushing, initialize baseline and source check fields
              // Only initialize if baseline not already present
              if (lifecycleStatus === "PUSHED" && 
                  (p.lifecycleStatus !== "PUSHED" || !p.sourceBaselinePriceKrw)) {
                return {
                  ...p,
                  lifecycleStatus,
                  sourceBaselinePriceKrw: baselinePriceKrw,
                  sourceLastCheckedPriceKrw: baselinePriceKrw,
                  sourceLastCheckedInStock: true,
                  sourceLastCheckedAt: now,
                  sourcePriceChanged: false,
                  sourceOutOfStock: false,
                }
              }
              
              return { ...p, lifecycleStatus }
            }),
            currentSearchResults: state.currentSearchResults.map((p) => {
              if (p.id !== id) return p
              
              const baselinePriceKrw = p.priceKrw ?? 0
              
              if (lifecycleStatus === "PUSHED" && 
                  (p.lifecycleStatus !== "PUSHED" || !p.sourceBaselinePriceKrw)) {
                return {
                  ...p,
                  lifecycleStatus,
                  sourceBaselinePriceKrw: baselinePriceKrw,
                  sourceLastCheckedPriceKrw: baselinePriceKrw,
                  sourceLastCheckedInStock: true,
                  sourceLastCheckedAt: now,
                  sourcePriceChanged: false,
                  sourceOutOfStock: false,
                }
              }
              
              return { ...p, lifecycleStatus }
            }),
          }
        })
      },

      updateMultipleProductsStatus: async (ids: string[], lifecycleStatus: ProductStatus) => {
        if (USE_API) {
          set({ isLoading: true })
          try {
            const updated = await apiClient.updateMultipleProductsStatus(ids, lifecycleStatus)
            const updatedMap = new Map(updated.map((p) => [p.id, p]))
            
            set((state) => ({
              products: state.products.map((p) => updatedMap.get(p.id) || p),
              currentSearchResults: state.currentSearchResults.map((p) =>
                updatedMap.get(p.id) || p
              ),
              isLoading: false,
            }))
          } catch (error) {
            console.error('Failed to update multiple products lifecycleStatus:', error)
            set({ isLoading: false })
            throw error
          }
          return
        }

        // Original localStorage mode
        set((state) => {
          const idSet = new Set(ids)
          return {
            products: state.products.map((p) =>
              idSet.has(p.id) ? { ...p, lifecycleStatus } : p
            ),
            currentSearchResults: state.currentSearchResults.map((p) =>
              idSet.has(p.id) ? { ...p, lifecycleStatus } : p
            ),
          }
        })
      },

      getProduct: (id: string) => {
        return get().products.find((p) => p.id === id)
      },

      validateProduct: (product: Product): ValidationResult => {
        const errors: { field: string; message: string }[] = []

        if (!product.nameMn || product.nameMn.trim() === "") {
          errors.push({ field: "nameMn", message: "Mongolian name is required" })
        }

        if (!product.descriptionMn || product.descriptionMn.trim() === "") {
          errors.push({
            field: "descriptionMn",
            message: "Mongolian description is required",
          })
        }

        if (!product.priceMnt || product.priceMnt <= 0) {
          errors.push({
            field: "priceMnt",
            message: "Price must be greater than 0",
          })
        }

        if (!product.imagesFinal || product.imagesFinal.length === 0) {
          errors.push({
            field: "imagesFinal",
            message: "At least one image is required",
          })
        }

        return {
          isValid: errors.length === 0,
          errors,
        }
      },

      toggleVisibility: async (id: string) => {
        if (USE_API) {
          set({ isLoading: true })
          try {
            const updated = await apiClient.toggleVisibility(id)
            set((state) => ({
              products: state.products.map((p) => (p.id === id ? updated : p)),
              currentSearchResults: state.currentSearchResults.map((p) =>
                p.id === id ? updated : p
              ),
              isLoading: false,
            }))
          } catch (error) {
            console.error('Failed to toggle visibility:', error)
            set({ isLoading: false })
            throw error
          }
          return
        }

        // Original localStorage mode
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  visibility: p.visibility === "public" ? "hidden" : "public",
                }
              : p
          ),
          currentSearchResults: state.currentSearchResults.map((p) =>
            p.id === id
              ? {
                  ...p,
                  visibility: p.visibility === "public" ? "hidden" : "public",
                }
              : p
          ),
        }))
      },

      runSourceCheckForPushedProducts: async () => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))

        const state = get()
        const pushedProducts = state.products.filter((p) => p.lifecycleStatus === "PUSHED")
        const now = new Date().toISOString()

        let priceChangedCount = 0
        let outOfStockCount = 0

        set((currentState) => ({
          products: currentState.products.map((p) => {
            if (p.lifecycleStatus !== "PUSHED") return p

            const baseline = p.sourceBaselinePriceKrw ?? p.priceKrw ?? 0
            const checkResult = simulateSourceCheck(
              p.id,
              p.sourceStore,
              p.sourceUrl,
              baseline
            )

            if (checkResult.priceChanged) priceChangedCount++
            if (checkResult.outOfStock) outOfStockCount++

            return {
              ...p,
              sourceLastCheckedPriceKrw: checkResult.newPriceKrw,
              sourceLastCheckedInStock: !checkResult.outOfStock,
              sourceLastCheckedAt: now,
              sourcePriceChanged: checkResult.priceChanged,
              sourceOutOfStock: checkResult.outOfStock,
            }
          }),
        }))

        return {
          checked: pushedProducts.length,
          priceChanged: priceChangedCount,
          outOfStock: outOfStockCount,
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      // Skip automatic hydration to prevent server/client mismatch
      skipHydration: true,
      // Only persist stable fields that should survive page reloads
      // Do NOT persist ephemeral UI state like isLoading, isInitialized, currentSearchResults
      partialize: (state) => ({
        products: state.products,
        searchParams: state.searchParams,
        // hasHydrated is never persisted (always starts false)
      }),
      migrate: (persistedState: any, version: number) => {
        try {
          if (version < 2) {
            // Migrate existing products
            if (persistedState?.state?.products) {
              persistedState.state.products = persistedState.state.products.map(migrateProduct)
            }
            if (persistedState?.state?.currentSearchResults) {
              persistedState.state.currentSearchResults =
                persistedState.state.currentSearchResults.map(migrateProduct)
            }
          }
          return persistedState
        } catch (error) {
          console.error('Migration failed:', error)
          // Return clean state on migration failure
          return {
            state: {
              products: [],
              currentSearchResults: [],
              searchParams: null,
            },
          }
        }
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Storage rehydration failed:', error)
        }
      },
    }
  )
)

