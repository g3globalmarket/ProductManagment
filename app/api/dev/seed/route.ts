import { NextResponse } from 'next/server'
import { createManyProducts } from '@/lib/server/products'
import { generateFakeProducts } from '@/lib/fake-data'
import { Store, Category } from '@/types/product'

export async function POST() {
  // Protect: only allow in development with explicit flag
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed endpoint not available in production' },
      { status: 403 }
    )
  }

  if (process.env.ALLOW_DEV_SEED !== 'true') {
    return NextResponse.json(
      { error: 'Seed endpoint disabled. Set ALLOW_DEV_SEED=true to enable.' },
      { status: 403 }
    )
  }

  try {
    // Generate deterministic fake products for all stores/categories
    const allProducts: any[] = []
    
    const stores: Store[] = ['gmarket', 'oliveyoung', 'auction']
    const categories: Record<Store, Category[]> = {
      gmarket: ['Skincare', 'Makeup', 'Haircare'],
      oliveyoung: ['Skincare', 'Makeup', 'Haircare'],
      auction: ['Electronics', 'Fashion', 'Home'],
    }

    for (const store of stores) {
      for (const category of categories[store]) {
        const products = generateFakeProducts(store, category, 5)
        // Keep id field (slug) for lookup, MongoDB will also generate _id
        // productToDoc will handle both _id and id fields
        allProducts.push(...products.map(p => ({ ...p })))
      }
    }

    const inserted = await createManyProducts(allProducts)
    
    return NextResponse.json(
      { insertedCount: inserted.length },
      { status: 200 }
    )
  } catch (error: any) {
    // Log full error with stack trace
    console.error('Error seeding database:', error)
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }

    // Return detailed error only in development
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        ...(isDev && { details: error?.message ?? String(error) }),
      },
      { status: 500 }
    )
  }
}

