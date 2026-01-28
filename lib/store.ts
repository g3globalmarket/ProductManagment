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
          // In API mode, search is still client-side fake data for now
          // Generate fake products and save them to DB
          set({ isLoading: true })
          try {
            await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))
            const fakeProducts = generateFakeProducts(store, category, count)
            
            // For MVP, we'll just use the fake products in state
            // In production, these would be saved to DB via API
            set({
              products: [...get().products, ...fakeProducts],
              currentSearchResults: fakeProducts,
              searchParams: { store, category, count },
              isLoading: false,
            })
          } catch (error) {
            console.error('Failed to search products:', error)
            set({ isLoading: false })
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
            const updated = await apiClient.updateProduct(id, changes)
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
            const updated = await apiClient.updateProductStatus(id, lifecycleStatus)
            
            // When pushing, initialize baseline and source check fields
            const now = new Date().toISOString()
            const finalUpdated = lifecycleStatus === "PUSHED" && updated.lifecycleStatus !== "PUSHED"
              ? {
                  ...updated,
                  sourceBaselinePriceKrw: updated.priceKrw,
                  sourceLastCheckedPriceKrw: updated.priceKrw,
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
              
              // When pushing, initialize baseline and source check fields
              if (lifecycleStatus === "PUSHED" && p.lifecycleStatus !== "PUSHED") {
                return {
                  ...p,
                  lifecycleStatus,
                  sourceBaselinePriceKrw: p.priceKrw,
                  sourceLastCheckedPriceKrw: p.priceKrw,
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
              
              if (lifecycleStatus === "PUSHED" && p.lifecycleStatus !== "PUSHED") {
                return {
                  ...p,
                  lifecycleStatus,
                  sourceBaselinePriceKrw: p.priceKrw,
                  sourceLastCheckedPriceKrw: p.priceKrw,
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

