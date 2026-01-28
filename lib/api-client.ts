import { Product, ProductStatus, DraftChanges } from '@/types/product'
import { normalizeProduct } from './normalizeProduct'

const API_BASE = '/api'

export class ApiClient {
  async getProducts(filters?: {
    lifecycleStatus?: ProductStatus
    store?: string
    visibility?: string
  }): Promise<Product[]> {
    const params = new URLSearchParams()
    if (filters?.lifecycleStatus) params.append('lifecycleStatus', filters.lifecycleStatus)
    if (filters?.store) params.append('store', filters.store)
    if (filters?.visibility) params.append('visibility', filters.visibility)

    const url = `${API_BASE}/products${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    
    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`)
    }
    
    const products = await res.json()
    // Normalize all products to ensure UI compatibility
    return Array.isArray(products) ? products.map(normalizeProduct) : []
  }

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`)
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Product not found')
      }
      throw new Error(`Failed to fetch product: ${res.statusText}`)
    }
    
    const product = await res.json()
    // Normalize product to ensure UI compatibility
    return normalizeProduct(product)
  }

  async updateProduct(id: string, changes: DraftChanges): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes),
    })
    
    if (!res.ok) {
      throw new Error(`Failed to update product: ${res.statusText}`)
    }
    
    const product = await res.json()
    // Normalize product to ensure UI compatibility
    return normalizeProduct(product)
  }

  async updateProductStatus(id: string, lifecycleStatus: ProductStatus): Promise<Product> {
    // Update lifecycleStatus by patching the product
    return this.updateProduct(id, { lifecycleStatus } as any)
  }

  async updateMultipleProductsStatus(
    ids: string[],
    lifecycleStatus: ProductStatus
  ): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products/bulk-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, lifecycleStatus }),
    })
    
    if (!res.ok) {
      throw new Error(`Failed to update bulk status: ${res.statusText}`)
    }
    
    const products = await res.json()
    // Normalize all products to ensure UI compatibility
    return Array.isArray(products) ? products.map(normalizeProduct) : []
  }

  async searchProducts(
    store: string,
    category: string,
    count: number
  ): Promise<Product[]> {
    // For now, search is still client-side (fake data)
    // In production, this would call a scraper API
    // For MVP, we'll generate fake data and then save to DB
    throw new Error('Search products not yet implemented via API')
  }

  async toggleVisibility(id: string): Promise<Product> {
    // Get current product to toggle visibility
    const product = await this.getProduct(id)
    const newVisibility = product.visibility === 'public' ? 'hidden' : 'public'
    const updated = await this.updateProduct(id, { visibility: newVisibility } as any)
    // normalizeProduct is already called in updateProduct, but ensure it's normalized
    return normalizeProduct(updated)
  }

  async runSourceCheck(): Promise<{ checked: number; priceChanged: number; outOfStock: number }> {
    // Not yet implemented in API
    throw new Error('Source check not yet implemented via API')
  }

  async seedDatabase(): Promise<{ insertedCount: number }> {
    const res = await fetch(`${API_BASE}/dev/seed`, {
      method: 'POST',
    })
    
    if (!res.ok) {
      throw new Error(`Failed to seed database: ${res.statusText}`)
    }
    
    return res.json()
  }
}

export const apiClient = new ApiClient()

